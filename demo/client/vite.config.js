// https://vitejs.dev/config/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],

  /*
  server: {
    proxy: {
      "/api": {
        target: "https://pfe-1back.onrender.com/api/",
        changeOrigin: true,
        secure: false,
      },
    },
  },*/
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "./src/responsive.scss" as *;`,
      },
    },
  },
});
