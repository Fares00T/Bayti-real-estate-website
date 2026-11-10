import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Internal admin dashboard. Runs on its own port/domain, separate from the
// public marketplace; ../shared holds the design tokens both apps use.
export default defineConfig({
  // Demo build: served at /admin/ on the same origin as the marketplace
  base: "/admin/",
  plugins: [react()],
  server: { port: 5174, strictPort: true, fs: { allow: [".."] } },
  preview: { port: 5174 },
});
