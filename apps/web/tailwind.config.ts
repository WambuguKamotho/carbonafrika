import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        savanna: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        earth: {
          50:  "#fdf8f0",
          100: "#faeedd",
          200: "#f4d9b5",
          300: "#ecbe85",
          400: "#e39a50",
          500: "#da7c2c",
          600: "#cc6320",
          700: "#a94a1b",
          800: "#89391e",
          900: "#72301b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg:   "0.75rem",
        xl:   "1rem",
        "2xl":"1.25rem",
        "3xl":"1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        "card-hover": "0 4px 16px 0 rgb(0 0 0 / 0.10), 0 2px 6px -1px rgb(0 0 0 / 0.08)",
        glow: "0 0 0 3px rgb(34 197 94 / 0.15)",
      },
      backgroundImage: {
        "hero-pattern": "radial-gradient(ellipse at top, #166534 0%, #14532d 50%, #052e16 100%)",
        "leaf-pattern": "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/G%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
