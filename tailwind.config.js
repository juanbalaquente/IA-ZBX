/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        noc: {
          surface: "#0B1220",
          surface2: "#111829",
          surface3: "#151C2C",
          accent: "#22D3EE",
          accentSoft: "#38BDF8",
          success: "#34D399",
          warning: "#F59E0B",
          danger: "#F87171",
          muted: "#94A3B8",
        },
      },
      boxShadow: {
        soft: "0 10px 24px rgba(15, 23, 42, 0.24)",
      },
    },
  },
  plugins: [],
};
