import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Studere",
  description: "Copiloto de estudio post-clase para convertir sesiones en materiales de aprendizaje activos.",
  keywords: ["estudio", "educación", "IA", "transcripción", "flashcards", "quiz", "aprendizaje activo"],
  authors: [{ name: "Studere Team" }],
  openGraph: {
    title: "Studere - Tu copiloto de estudio con IA",
    description: "Convierte tus clases en materiales de estudio activos: transcripciones, resúmenes, flashcards y quiz generados automáticamente.",
    type: "website",
    locale: "es_AR",
    siteName: "Studere",
  },
  twitter: {
    card: "summary_large_image",
    title: "Studere - Tu copiloto de estudio con IA",
    description: "Convierte tus clases en materiales de estudio activos con IA.",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: false, // App privada, no indexar
    follow: false,
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem("studere-theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
