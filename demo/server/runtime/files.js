// Private document bytes, kept in IndexedDB (falls back to memory).
const memory = new Map();
const DB = "bayti_demo_files";

const open = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction("files", mode);
    const result = fn(t.objectStore("files"));
    t.oncomplete = () => resolve(result.result);
    t.onerror = () => reject(t.error);
  });
};

export async function putFile(key, bytes, mime) {
  memory.set(key, bytes);
  try {
    await tx("readwrite", (s) => s.put({ bytes, mime }, key));
  } catch {
    /* memory only */
  }
}

export async function getFile(key) {
  if (memory.has(key)) return memory.get(key);
  const row = await tx("readonly", (s) => s.get(key)).catch(() => null);
  if (!row) return null;
  memory.set(key, row.bytes);
  return row.bytes;
}

export async function deleteFile(key) {
  memory.delete(key);
  await tx("readwrite", (s) => s.delete(key)).catch(() => {});
}

export async function clearFiles() {
  memory.clear();
  await tx("readwrite", (s) => s.clear()).catch(() => {});
}

// A small valid one-page PDF used for documents that came with the seed data
export function placeholderPdf(name = "document.pdf", kind = "") {
  const clean = (s) => String(s).replace(/[()\\]/g, "").slice(0, 70);
  const lines = [
    ["Bayti - demo document", 24, 760],
    [clean(name), 14, 720],
    [kind ? `Type: ${clean(kind)}` : "", 12, 696],
    ["This file stands in for the real document in the investor demo.", 11, 660],
  ].filter(([t]) => t);
  const content = lines.map(([t, size, y]) => `BT /F1 ${size} Tf 60 ${y} Td (${t}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
