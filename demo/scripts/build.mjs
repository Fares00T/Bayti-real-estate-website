// Builds the three apps into one folder that Vercel (or any static host)
// serves: marketplace at /, agency platform at /agency/, admin at /admin/.
import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const run = (cmd, cwd) => {
  console.log(`\n> ${cmd}  (${cwd.replace(root, "demo/")})`);
  const r = spawnSync(cmd, { cwd, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status || 1);
};

run("node scripts/gen-schema.mjs", root);
rmSync(root + "dist", { recursive: true, force: true });

const apps = [
  ["client", "dist"],
  ["agency", "dist/agency"],
  ["admin", "dist/admin"],
];
for (const [app, out] of apps) {
  const dir = `${root}${app}/`;
  if (!existsSync(dir + "node_modules")) run("npm ci --no-audit --no-fund || npm install --no-audit --no-fund", dir);
  run(`npx vite build --outDir "${root}${out}" --emptyOutDir`, dir);
}
console.log("\nDemo built in demo/dist");
