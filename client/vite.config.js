// https://vitejs.dev/config/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";
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
        // Sass's modern API (Vite 6+) resolves @use relative to each file, so
        // the project root is added as a load path for the injected import.
        loadPaths: [fileURLToPath(new URL(".", import.meta.url))],
      },
    },
  },
});
