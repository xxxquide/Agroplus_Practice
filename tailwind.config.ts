import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: "#005F73",
        secondary: "#94D2BD",
        accent: "#EE9B00",
        ink: "#1D3557",
        base: "#F6F7FB"
      },
      boxShadow: {
        glass: "0 24px 60px rgba(20, 40, 60, 0.12)",
        insetSoft: "inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -2px 6px rgba(15, 25, 40, 0.1)"
      },
      borderRadius: {
        panel: "28px",
        card: "20px",
        input: "16px"
      },
      backgroundImage: {
        aurora: "radial-gradient(1200px 600px at 10% -10%, #E9E6FF 0%, transparent 60%), radial-gradient(900px 600px at 90% 0%, #FCE7F3 0%, transparent 55%), radial-gradient(800px 600px at 50% 100%, #E6FAF7 0%, transparent 60%)"
      }
    }
  },
  plugins: []
};

export default config;
