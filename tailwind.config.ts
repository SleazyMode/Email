import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#153047",
        civic: "#24597A",
        slate: "#EDF3F7",
        border: "#C9D7E1",
        success: "#1B6B53",
        warning: "#B7791F",
        danger: "#A43C2A"
      },
      boxShadow: {
        panel: "0 14px 40px rgba(17, 36, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
