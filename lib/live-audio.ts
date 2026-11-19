export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x2000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

export function downsampleFloat32ToInt16Pcm(
  input: Float32Array,
  inputSampleRate: number,
  targetRate = 16000,
): Int16Array {
  if (input.length === 0) return new Int16Array(0)

  if (inputSampleRate === targetRate) {
    const out = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      const clamped = Math.max(-1, Math.min(1, input[i]))
      out[i] = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767)
    }
    return out
  }

  const ratio = inputSampleRate / targetRate
  const outputLength = Math.max(1, Math.floor(input.length / ratio))
  const out = new Int16Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const pos = i * ratio
    const idx = Math.floor(pos)
    const frac = pos - idx
    const s0 = input[idx] ?? 0
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0
    const sample = s0 + (s1 - s0) * frac
    const clamped = Math.max(-1, Math.min(1, sample))
    out[i] = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767)
  }

  return out
}

function pcmInt16BytesToFloat32(pcmBytes: Uint8Array): Float32Array {
  const sampleCount = Math.floor(pcmBytes.byteLength / 2)
  const out = new Float32Array(sampleCount)
  const view = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength)
  for (let i = 0; i < sampleCount; i++) {
    const val = view.getInt16(i * 2, true)
    out[i] = val < 0 ? val / 32768 : val / 32767
  }
  return out
}

const WORKLET_PROCESSOR_SOURCE = `
class LivePcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      const copy = new Float32Array(input[0].length);
      copy.set(input[0]);
      this.port.postMessage(copy, [copy.buffer]);
    }
    return true;
  }
}
registerProcessor('live-pcm-capture-processor', LivePcmCaptureProcessor);
`

export class LiveAudioCapture {
  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private scriptNode: ScriptProcessorNode | null = null
  private sinkGain: GainNode | null = null
  private muted = false
  private pendingSamples: number[] = []
  private readonly chunkSampleTarget = 1600 // ~100ms at 16kHz

  async start(onChunk: (base64Pcm: string, rms: number) => void, onLevel?: (rms: number) => void): Promise<void> {
    if (this.ctx) return

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Tu navegador no soporta captura de micrófono.")
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    })

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AudioCtx()
    if (this.ctx.state === "suspended") {
      await this.ctx.resume()
    }

    const inputRate = this.ctx.sampleRate
    this.sourceNode = this.ctx.createMediaStreamSource(this.stream)
    this.sinkGain = this.ctx.createGain()
    this.sinkGain.gain.value = 0
    this.sinkGain.connect(this.ctx.destination)

    const handleFrame = (floatFrame: Float32Array) => {
      if (this.muted) {
        onLevel?.(0)
        return
      }

      let sumSq = 0
      for (let i = 0; i < floatFrame.length; i++) {
        sumSq += floatFrame[i] * floatFrame[i]
      }
      const rms = Math.min(1, Math.sqrt(sumSq / Math.max(1, floatFrame.length)) * 4)
      onLevel?.(rms)

      const pcm16 = downsampleFloat32ToInt16Pcm(floatFrame, inputRate, 16000)
      for (let i = 0; i < pcm16.length; i++) {
        this.pendingSamples.push(pcm16[i])
      }

      while (this.pendingSamples.length >= this.chunkSampleTarget) {
        const batch = this.pendingSamples.splice(0, this.chunkSampleTarget)
        const int16 = new Int16Array(batch)
        const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength)
        onChunk(bytesToBase64(bytes), rms)
      }
    }

    if (this.ctx.audioWorklet && typeof URL.createObjectURL === "function") {
      try {
        const blob = new Blob([WORKLET_PROCESSOR_SOURCE], { type: "application/javascript" })
        const url = URL.createObjectURL(blob)
        try {
          await this.ctx.audioWorklet.addModule(url)
        } finally {
          URL.revokeObjectURL(url)
        }
        this.workletNode = new AudioWorkletNode(this.ctx, "live-pcm-capture-processor")
        this.workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
          if (event.data instanceof Float32Array) {
            handleFrame(event.data)
          }
        }
        this.sourceNode.connect(this.workletNode)
        this.workletNode.connect(this.sinkGain)
        return
      } catch {
        // Fallback smoothly to ScriptProcessorNode below if worklet/blob is blocked
      }
    }

    this.scriptNode = this.ctx.createScriptProcessor(4096, 1, 1)
    this.scriptNode.onaudioprocess = (event) => {
      const channel = event.inputBuffer.getChannelData(0)
      handleFrame(new Float32Array(channel))
    }
    this.sourceNode.connect(this.scriptNode)
    this.scriptNode.connect(this.sinkGain)
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (muted) {
      this.pendingSamples = []
    }
  }

  async stop(): Promise<void> {
    this.pendingSamples = []
    try {
      this.workletNode?.disconnect()
      if (this.workletNode) this.workletNode.port.onmessage = null
      this.scriptNode?.disconnect()
      if (this.scriptNode) this.scriptNode.onaudioprocess = null
      this.sourceNode?.disconnect()
      this.sinkGain?.disconnect()
    } catch {
      /* ignore disconnect errors */
    }
    this.workletNode = null
    this.scriptNode = null
    this.sourceNode = null
    this.sinkGain = null

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
      this.stream = null
    }

    if (this.ctx) {
      await this.ctx.close().catch(() => {})
      this.ctx = null
    }
  }
}

export class LiveAudioPlayer {
  private ctx: AudioContext | null = null
  private nextStartTime = 0
  private activeSources = new Set<AudioBufferSourceNode>()
  private onPlayingChange?: (playing: boolean) => void

  constructor(onPlayingChange?: (playing: boolean) => void) {
    this.onPlayingChange = onPlayingChange
  }

  async prepare(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx({ sampleRate: 24000 })
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume()
    }
  }

  enqueuePcm24k(base64Pcm: string): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AudioCtx({ sampleRate: 24000 })
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume()
    }

    const bytes = base64ToBytes(base64Pcm)
    const samples = pcmInt16BytesToFloat32(bytes)
    if (samples.length === 0) return

    const buffer = this.ctx.createBuffer(1, samples.length, 24000)
    buffer.getChannelData(0).set(samples)

    const source = this.ctx.createBufferSource()
    source.buffer = buffer
    source.connect(this.ctx.destination)

    const now = this.ctx.currentTime
    const startAt = Math.max(now + 0.02, this.nextStartTime)
    this.nextStartTime = startAt + buffer.duration

    this.activeSources.add(source)
    if (this.activeSources.size === 1) {
      this.onPlayingChange?.(true)
    }

    source.onended = () => {
      this.activeSources.delete(source)
      if (this.activeSources.size === 0) {
        this.onPlayingChange?.(false)
      }
    }

    source.start(startAt)
  }

  interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.onended = null
        source.stop()
        source.disconnect()
      } catch {
        /* ignore already stopped */
      }
    }
    this.activeSources.clear()
    this.nextStartTime = 0
    this.onPlayingChange?.(false)
  }

  async close(): Promise<void> {
    this.interrupt()
    if (this.ctx) {
      await this.ctx.close().catch(() => {})
      this.ctx = null
    }
  }
}
