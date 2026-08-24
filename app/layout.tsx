import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { DM_Mono, DM_Sans, Lora } from "next/font/google"
import "./globals.css"

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" })
const serif = Lora({ subsets: ["latin"], variable: "--font-lora" })
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" })

export const metadata: Metadata = {
  title: "Wordshift — English Grammar Practice",
  description: "Focused, level-based English grammar practice with clear explanations and progress tracking.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4f1e8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`bg-background ${sans.variable} ${serif.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
