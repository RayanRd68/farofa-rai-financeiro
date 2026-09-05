import type { Metadata, Viewport } from "next"
import { Fraunces, Karla, JetBrains_Mono } from "next/font/google"

import { APP_NAME } from "@/lib/constants"
import { Bunting } from "@/components/bunting"
import "./globals.css"

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700", "900"],
  variable: "--font-fraunces",
  display: "swap",
})
const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-karla",
  display: "swap",
})
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  title: `${APP_NAME} — Controle Financeiro`,
  description: "Controle financeiro da Farofa da Rai.",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3b2717",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${fraunces.variable} ${karla.variable} ${jetbrains.variable}`}
      >
        <div id="app">
          <Bunting />
          {children}
        </div>
      </body>
    </html>
  )
}
