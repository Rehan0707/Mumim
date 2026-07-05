/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Munim brand — deep teal from the spec documents
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          400: "#34d399",
          500: "#10b981",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#0f3d3e",
          950: "#0a2e2e",
        },
        wa: { bg: "#0b141a", panel: "#111b21", bubble: "#005c4b", inbound: "#202c33" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};
