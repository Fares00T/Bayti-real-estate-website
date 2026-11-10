import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Agency platform. Runs on its own port/domain, separate from the public
// marketplace and the internal admin dashboard; ../shared holds the design
// tokens all three apps use.
export default defineConfig({
  // Demo build: served at /agency/ on the same origin as the marketplace
  base: "/agency/",
  plugins: [react()],
  server: { port: 5175, strictPort: true, fs: { allow: [".."] } },
  preview: { port: 5175 },
});
