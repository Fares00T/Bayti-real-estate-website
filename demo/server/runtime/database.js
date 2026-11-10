// The demo database: an in-memory Prisma look-alike, seeded on first visit
// and saved in the visitor's browser. Every tab and all three apps (same
// origin) share it.
import { createPrisma } from "./prisma.js";
import schema from "./schema.js";
import { buildSeed } from "../seed.js";
import { store } from "./storage.js";
import { clearAllCookies } from "./cookies.js";
import { clearFiles } from "./files.js";

// Bump when the seed or schema changes so visitors get fresh data
export const DB_KEY = "bayti_demo_db_v1";

const load = () => {
  try {
    return JSON.parse(store.get(DB_KEY));
  } catch {
    return null;
  }
};

let saveTimer = null;
const saveNow = () => {
  clearTimeout(saveTimer);
  saveTimer = null;
  store.set(DB_KEY, JSON.stringify(prisma.$data));
};
const scheduleSave = () => {
  if (!saveTimer) saveTimer = setTimeout(saveNow, 0);
};

const initial = load();
export const prisma = createPrisma({ schema, data: initial || buildSeed(), onChange: scheduleSave });
if (!initial) saveNow();

if (typeof window !== "undefined") {
  // Never lose a write when the visitor jumps to another app
  window.addEventListener("pagehide", () => saveTimer && saveNow());
  // Another tab changed the data
  window.addEventListener("storage", (e) => {
    if (e.key === DB_KEY && e.newValue) {
      try {
        prisma.$replace(JSON.parse(e.newValue));
      } catch {
        /* ignore */
      }
    }
  });
}

export async function resetDemo() {
  prisma.$replace(buildSeed());
  saveNow();
  clearAllCookies();
  await clearFiles();
}
