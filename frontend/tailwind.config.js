/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Enable class-based dark mode toggle (<html class="dark"> or <html class="light">)
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dynamic theme-aware CSS variables
        ink: "var(--ink)",
        canvas: {
          ops: "var(--canvas-ops)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          muted: "var(--surface-muted)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
        },
        text: {
          DEFAULT: "var(--text)",
          body: "var(--text-body)",
          muted: "var(--text-muted)",
        },
        forest: {
          DEFAULT: "var(--forest-primary)",
          deep: "var(--forest-deep)",
          hover: "var(--forest-hover)",
          accent: "var(--forest-accent)",
          light: "var(--forest-light)",
        },
        linen: {
          DEFAULT: "var(--linen-bg)",
          surface: "var(--surface-2)",
          muted: "var(--surface-muted)",
          border: "var(--border-subtle)",
        },
        camel: {
          DEFAULT: "var(--gold)",
          hover: "var(--gold-hover)",
          light: "var(--gold-light)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          hover: "var(--gold-hover)",
          light: "#E3C287",
        },
        aqua: {
          DEFAULT: "var(--aqua)",
          hover: "var(--aqua-hover)",
          light: "#6FE0DA",
        },
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        serif: ["Fraunces", "serif"],
        playfair: ["'Playfair Display'", "serif"],
        sans: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
    },
  },
  plugins: [],
};
