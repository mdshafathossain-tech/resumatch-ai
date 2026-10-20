import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#1F3A5F",
          teal: "#0E8F8C",
          mint: "#E8F4F3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
