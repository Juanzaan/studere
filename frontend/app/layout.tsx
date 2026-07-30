import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Public_Sans, Space_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
  adjustFontFallback: true,
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  preload: true,
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
  preload: true,
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-mono",
  weight: ["400", "700"],
  preload: true,
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
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeScript = `(function(){try{var t=localStorage.getItem("studere-theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${fraunces.variable} ${publicSans.variable} ${spaceMono.variable} font-sans antialiased`}>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
