import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Internal admin dashboard. Runs on its own port/domain, separate from the
// public marketplace; ../shared holds the design tokens both apps use.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true, fs: { allow: [".."] } },
  preview: { port: 5174 },
});
