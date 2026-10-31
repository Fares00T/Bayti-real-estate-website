// Dumps every table to backups/<timestamp>.json (full rows, raw SQL) so a
// migration can be undone by hand. Usage: node backups/backup.mjs
import fs from "fs";
import prisma from "../lib/prisma.js";

const tables = (await prisma.$queryRawUnsafe("SHOW TABLES")).map((r) => Object.values(r)[0]);
const dump = {};
for (const t of tables) dump[t] = await prisma.$queryRawUnsafe(`SELECT * FROM \`${t}\``);
const file = new URL(`./${new Date().toISOString().replace(/[:.]/g, "-")}.json`, import.meta.url);
fs.writeFileSync(file, JSON.stringify(dump, (k, v) => (typeof v === "bigint" ? Number(v) : v), 2));
console.log(`Saved ${tables.length} tables to ${file.pathname}`);
await prisma.$disconnect();
