import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#f8faff",
        panel: "#ffffff",
        line: "rgba(226, 232, 240, 0.9)",
        accent: "#7c3aed",
        accentSoft: "rgba(124, 58, 237, 0.08)",
        success: "#10b981",
        // Mejoras de contraste para dark mode (WCAG AA compliant)
        "slate-350": "#b0b8c4", // Reemplazo para slate-400 en dark mode (mejor contraste sobre slate-800)
      },
      boxShadow: {
        card: "0 20px 60px rgba(15, 23, 42, 0.08)",
        "card-hover": "0 24px 72px rgba(15, 23, 42, 0.12)",
        "card-lift": "0 28px 80px rgba(15, 23, 42, 0.10), 0 0 0 1px rgba(124, 58, 237, 0.06)",
        glow: "0 0 0 1px rgba(124, 58, 237, 0.12), 0 8px 32px rgba(124, 58, 237, 0.08)"
      },
      borderRadius: {
        xl2: "1.25rem",
        "4xl": "1.75rem"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" }
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-scale": "fade-in-scale 0.25s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out"
      }
    }
  },
  plugins: []
};

export default config;
