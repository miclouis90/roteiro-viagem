import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "firebase-auth": ["firebase/app", "firebase/auth"],
          "firebase-store": ["firebase/firestore"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
