"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Edit3,
  ImageIcon,
  Lightbulb,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from "lucide-react"
import { AudioWordBadge } from "@/components/audio-word-badge"
import { cefrLevels, levelLabel, type CefrLevel } from "@/lib/question-bank"
import { getDefaultTopicTheoryData, type TopicDef, type TopicTheoryData } from "@/lib/topics"
import { useEffect } from "react"

type TopicTheoryProps = {
  level: CefrLevel
  topic: TopicDef
  onStartPractice: () => void
  onBack: () => void
  isTeacher?: boolean
  onTopicUpdated?: (updatedTopic: TopicDef) => void
  starting?: boolean
}

export function TopicTheory({
  level,
  topic,
  onStartPractice,
  onBack,
  isTeacher = false,
  onTopicUpdated,
  starting = false,
}: TopicTheoryProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Current Theory State synchronized with topic/level
  const initialTheory = getDefaultTopicTheoryData(topic, level)
  const [theoryData, setTheoryData] = useState<TopicTheoryData>(initialTheory)

  useEffect(() => {
    setTheoryData(getDefaultTopicTheoryData(topic, level))
  }, [topic, level])

  // Form State for editing
  const [editTitle, setEditTitle] = useState(topic.title)
  const [editLevel, setEditLevel] = useState<CefrLevel>(topic.level || level)
  const [editConcept, setEditConcept] = useState(initialTheory.concept || "")
  const [editImageUrl, setEditImageUrl] = useState(initialTheory.imageUrl || "")
  const [editImageCaption, setEditImageCaption] = useState(initialTheory.imageCaption || "")
  const [editFormula, setEditFormula] = useState(initialTheory.formula || [])
  const [editExamples, setEditExamples] = useState(initialTheory.examples || [])
  const [editTips, setEditTips] = useState(initialTheory.tips || [])
  const [editKeyWords, setEditKeyWords] = useState((initialTheory.keyWords || []).join(", "))

  function handleOpenEdit() {
    setEditTitle(topic.title)
    setEditLevel(topic.level || level)
    setEditConcept(theoryData.concept || "")
    setEditImageUrl(theoryData.imageUrl || "")
    setEditImageCaption(theoryData.imageCaption || "")
    setEditFormula([...(theoryData.formula || [])])
    setEditExamples([...(theoryData.examples || [])])
    setEditTips([...(theoryData.tips || [])])
    setEditKeyWords((theoryData.keyWords || []).join(", "))
    setError(null)
    setSuccess(false)
    setEditing(true)
  }

  // Formula helpers
  function addFormulaItem() {
    setEditFormula([...editFormula, { label: "Rule", text: "Structure formula..." }])
  }
  function updateFormulaItem(index: number, field: "label" | "text", val: string) {
    const updated = [...editFormula]
    updated[index][field] = val
    setEditFormula(updated)
  }
  function removeFormulaItem(index: number) {
    setEditFormula(editFormula.filter((_, i) => i !== index))
  }

  // Examples helpers
  function addExampleItem() {
    setEditExamples([...editExamples, { en: "English example sentence.", es: "Traducción en español.", tip: "Didactic tip..." }])
  }
  function updateExampleItem(index: number, field: "en" | "es" | "tip", val: string) {
    const updated = [...editExamples]
    updated[index][field] = val
    setEditExamples(updated)
  }
  function removeExampleItem(index: number) {
    setEditExamples(editExamples.filter((_, i) => i !== index))
  }

  // Tips helpers
  function addTipItem() {
    setEditTips([...editTips, "New study tip or common mistake to avoid..."])
  }
  function updateTipItem(index: number, val: string) {
    const updated = [...editTips]
    updated[index] = val
    setEditTips(updated)
  }
  function removeTipItem(index: number) {
    setEditTips(editTips.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const cleanedKeywords = editKeyWords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0)

    const newTheory: TopicTheoryData = {
      concept: editConcept.trim(),
      imageUrl: editImageUrl.trim() || undefined,
      imageCaption: editImageCaption.trim() || undefined,
      formula: editFormula.filter((f) => f.label.trim() && f.text.trim()),
      examples: editExamples.filter((e) => e.en.trim()),
      tips: editTips.filter((t) => t.trim()),
      keyWords: cleanedKeywords,
    }

    try {
      const res = await fetch("/api/teacher/topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: topic.slug,
          level: topic.level || level,
          title: editTitle.trim(),
          newLevel: editLevel !== (topic.level || level) ? editLevel : undefined,
          theory: newTheory,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to save topic theory.")
      }

      const updatedTopic: TopicDef = {
        ...topic,
        title: editTitle.trim(),
        level: editLevel,
        theory: newTheory,
      }

      setTheoryData(newTheory)
      setSuccess(true)
      setEditing(false)

      if (onTopicUpdated) {
        onTopicUpdated(updatedTopic)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving theory.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-8 md:px-8 md:py-12">
      {/* Top Navigation & Teacher Edit Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button onClick={onBack} className="button-back">
          <ArrowLeft size={16} /> Back to {levelLabel(level)} topics
        </button>

        <div className="flex items-center gap-3">
          <span className="tag font-mono text-xs uppercase">{levelLabel(topic.level || level)}</span>

          {isTeacher && !editing && (
            <button
              onClick={handleOpenEdit}
              className="button-secondary flex items-center gap-2 py-1.5 px-3 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 shadow-sm"
              title="Edit overview, grammar structures, diagrams, and examples"
            >
              <Edit3 size={14} /> Editar Teoría
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-sm font-medium animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>¡Teoría del tema guardada exitosamente para todos los estudiantes!</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEACHER EDIT MODE FORM */}
      {/* ========================================================================= */}
      {editing ? (
        <div className="flex flex-col gap-7 border-2 border-primary/40 bg-card p-6 md:p-8 rounded-xl shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Edit3 size={18} />
              <span>Panel de Edición: Topic Overview & Theory</span>
            </div>
            <button
              onClick={() => setEditing(false)}
              className="icon-button size-8 text-muted-foreground hover:text-foreground"
              aria-label="Cancel editing"
            >
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded text-sm">
              {error}
            </div>
          )}

          {/* Section 1: Title & Level Reassignment */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Título del Topic
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input-field text-base font-semibold"
                placeholder="Topic Title..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nivel CEFR (Mover Topic)
              </label>
              <select
                value={editLevel}
                onChange={(e) => setEditLevel(e.target.value as CefrLevel)}
                className="input-field text-sm font-medium bg-card"
              >
                {cefrLevels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.code} - {lvl.exam}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Subtitle / Concept */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Subtítulo / Concepto Explicativo
            </label>
            <textarea
              value={editConcept}
              onChange={(e) => setEditConcept(e.target.value)}
              rows={3}
              className="input-field text-sm leading-relaxed p-3"
              placeholder="Explicación clara del tema gramatical para los alumnos..."
            />
          </div>

          {/* Section 3: Grammar Structures & Formulas */}
          <div className="flex flex-col gap-3 border border-border p-4 rounded-lg bg-secondary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Sparkles size={15} className="text-primary" /> Estructuras Gramaticales Clave (Fórmulas)
              </span>
              <button
                type="button"
                onClick={addFormulaItem}
                className="button-secondary py-1 px-2.5 text-xs flex items-center gap-1 font-semibold"
              >
                <Plus size={13} /> Añadir Regla
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {editFormula.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-card p-2.5 rounded border border-border">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateFormulaItem(idx, "label", e.target.value)}
                    className="input-field w-32 shrink-0 text-xs font-mono uppercase font-bold"
                    placeholder="Affirmative..."
                  />
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => updateFormulaItem(idx, "text", e.target.value)}
                    className="input-field flex-1 text-xs"
                    placeholder="Subject + verb..."
                  />
                  <button
                    type="button"
                    onClick={() => removeFormulaItem(idx)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    title="Eliminar regla"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Optional Structure Diagram / Image */}
          <div className="flex flex-col gap-3 border border-border p-4 rounded-lg bg-secondary/20">
            <span className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon size={15} className="text-primary" /> Imagen o Diagrama Explicativo de la Estructura (Opcional)
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">URL de la imagen</label>
                <input
                  type="url"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="input-field text-xs"
                  placeholder="https://ejemplo.com/diagrama-estructura.png"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Pie de foto / Descripción</label>
                <input
                  type="text"
                  value={editImageCaption}
                  onChange={(e) => setEditImageCaption(e.target.value)}
                  className="input-field text-xs"
                  placeholder="Diagrama de uso de los tiempos verbales..."
                />
              </div>
            </div>

            {editImageUrl.trim() && (
              <div className="mt-2 p-3 bg-card border border-border rounded flex flex-col items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Vista previa de la imagen:</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editImageUrl.trim()}
                  alt={editImageCaption || "Structure Diagram"}
                  className="max-h-48 rounded object-contain border border-border shadow-sm"
                  onError={(e) => {
                    ;(e.target as HTMLElement).style.display = "none"
                  }}
                />
              </div>
            )}
          </div>

          {/* Section 5: Natural Examples */}
          <div className="flex flex-col gap-3 border border-border p-4 rounded-lg bg-secondary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 size={15} className="text-primary" /> Ejemplos Naturales
              </span>
              <button
                type="button"
                onClick={addExampleItem}
                className="button-secondary py-1 px-2.5 text-xs flex items-center gap-1 font-semibold"
              >
                <Plus size={13} /> Añadir Ejemplo
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {editExamples.map((ex, idx) => (
                <div key={idx} className="flex flex-col gap-2 bg-card p-3 rounded border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">Ejemplo #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeExampleItem(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      title="Eliminar ejemplo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={ex.en}
                      onChange={(e) => updateExampleItem(idx, "en", e.target.value)}
                      className="input-field text-xs font-serif font-medium"
                      placeholder="English sentence..."
                    />
                    <input
                      type="text"
                      value={ex.es}
                      onChange={(e) => updateExampleItem(idx, "es", e.target.value)}
                      className="input-field text-xs italic"
                      placeholder="Traducción en español..."
                    />
                  </div>
                  <input
                    type="text"
                    value={ex.tip || ""}
                    onChange={(e) => updateExampleItem(idx, "tip", e.target.value)}
                    className="input-field text-xs bg-secondary/30"
                    placeholder="Tip pedagógico (ej. Usar con tercera persona)..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Tips & Mistakes */}
          <div className="flex flex-col gap-3 border border-border p-4 rounded-lg bg-secondary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb size={15} className="text-amber-500" /> Tips & Errores Comunes
              </span>
              <button
                type="button"
                onClick={addTipItem}
                className="button-secondary py-1 px-2.5 text-xs flex items-center gap-1 font-semibold"
              >
                <Plus size={13} /> Añadir Tip
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {editTips.map((tip, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-card p-2 rounded border border-border">
                  <input
                    type="text"
                    value={tip}
                    onChange={(e) => updateTipItem(idx, e.target.value)}
                    className="input-field flex-1 text-xs"
                    placeholder="Consejo de estudio o error común a evitar..."
                  />
                  <button
                    type="button"
                    onClick={() => removeTipItem(idx)}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Key Words & Phonetics */}
          <div className="flex flex-col gap-1.5 border border-border p-4 rounded-lg bg-secondary/20">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Volume2 size={15} className="text-primary" /> Palabras Clave del Tema (Audio y Fonética)
            </span>
            <span className="text-xs text-muted-foreground">
              Ingresa palabras clave separadas por comas. El sistema generará automáticamente los badges con audio y fonética.
            </span>
            <input
              type="text"
              value={editKeyWords}
              onChange={(e) => setEditKeyWords(e.target.value)}
              className="input-field text-xs font-mono"
              placeholder="yesterday, now, student, teacher, library"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="button-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="button-primary flex items-center gap-2 py-2.5 px-6 shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save size={16} /> Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* STANDARD TOPIC VIEW (STUDENT / DISPLAY MODE) */
        /* ========================================================================= */
        <>
          {/* Main Topic Header */}
          <section className="flex flex-col gap-4 border-b border-border pb-8">
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-widest">
              <BookOpen size={15} /> Topic Overview & Theory
            </div>
            <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              {topic.title}
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-muted-foreground">
              {theoryData.concept}
            </p>
          </section>

          {/* Key Grammar Rules & Formulas */}
          {theoryData.formula && theoryData.formula.length > 0 && (
            <section className="flex flex-col gap-4 bg-card border border-border p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Sparkles size={17} className="text-primary" /> Key Grammar Structures
              </h2>
              <div className="flex flex-col gap-2.5">
                {theoryData.formula.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-baseline gap-2 bg-secondary/50 p-3 rounded border border-border/50 text-sm"
                  >
                    <span className="font-mono text-xs font-bold text-primary min-w-28 uppercase">
                      {item.label}:
                    </span>
                    <span className="font-medium text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Optional Explanatory Diagram / Image */}
          {theoryData.imageUrl && (
            <section className="flex flex-col items-center justify-center gap-2 p-3 sm:p-5 bg-card border border-border rounded-lg shadow-sm overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theoryData.imageUrl}
                alt={theoryData.imageCaption || `${topic.title} structure diagram`}
                loading="lazy"
                className="max-h-[300px] sm:max-h-[420px] md:max-h-[500px] w-auto max-w-full rounded-md object-contain border border-border/50 shadow-xs bg-secondary/10"
              />
              {theoryData.imageCaption && (
                <p className="text-xs sm:text-sm text-muted-foreground italic text-center mt-2 max-w-2xl px-2">
                  {theoryData.imageCaption}
                </p>
              )}
            </section>
          )}

          {/* Natural Examples */}
          {theoryData.examples && theoryData.examples.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <CheckCircle2 size={17} className="text-primary" /> Natural Examples
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {theoryData.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="border border-border bg-card p-4 rounded flex flex-col justify-between gap-2 shadow-xs"
                  >
                    <div>
                      <p className="font-serif text-base font-medium text-foreground">&ldquo;{ex.en}&rdquo;</p>
                      {ex.es && <p className="text-xs text-muted-foreground mt-1 italic">{ex.es}</p>}
                    </div>
                    {ex.tip && (
                      <p className="text-[11px] text-primary/90 bg-primary/10 p-2 rounded border border-primary/20">
                        <strong>Tip:</strong> {ex.tip}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pro Tips & Common Mistakes */}
          {theoryData.tips && theoryData.tips.length > 0 && (
            <section className="flex flex-col gap-3 border-l-2 border-primary bg-secondary/40 p-5 rounded-r">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Lightbulb size={16} className="text-amber-500" /> Tips & Common Mistakes to Avoid
              </h3>
              <ul className="flex flex-col gap-2 pl-4 list-disc text-xs md:text-sm text-muted-foreground leading-relaxed">
                {theoryData.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Key Vocabulary & Pronunciation */}
          {theoryData.keyWords && theoryData.keyWords.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Volume2 size={16} className="text-primary" /> Key Topic Words (Audio & Phonetics)
                </h3>
                <span className="text-xs text-muted-foreground">Click speaker to listen</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {theoryData.keyWords.map((w) => (
                  <AudioWordBadge key={w} word={w} />
                ))}
              </div>
            </section>
          )}

          {/* Bottom CTA Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6 mt-4">
            <button onClick={onBack} className="button-secondary w-full sm:w-auto">
              <ArrowLeft size={16} /> All {levelLabel(level)} Topics
            </button>

            <button
              onClick={onStartPractice}
              disabled={starting}
              className="button-primary w-full sm:w-auto py-3 px-6 text-base font-semibold shadow-md flex items-center justify-center gap-2"
            >
              {starting ? (
                "Loading exercises..."
              ) : (
                <>
                  Empezar a practicar <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
