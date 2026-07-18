import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta RutaClara: azul oscuro principal, verde plata/confirmación,
        // naranja para urgencia/acción rápida.
        rc: {
          azul: "#1e3a5f",
          "azul-claro": "#2d5688",
          verde: "#16a34a",
          "verde-claro": "#dcfce7",
          naranja: "#f97316",
          "naranja-claro": "#ffedd5",
          amarillo: "#eab308",
          "amarillo-claro": "#fef9c3",
          rojo: "#dc2626",
          "rojo-claro": "#fee2e2",
        },
      },
      fontSize: {
        base: ["1rem", "1.5rem"],
      },
      boxShadow: {
        tarjeta: "0 2px 10px 0 rgba(30, 58, 95, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
