// Demo build: private documents (legal papers, report screenshots) are kept
// in the browser's IndexedDB instead of a server folder. Same exports and
// checks as the production module.
import { createHash, randomBytes } from "../shims/crypto.js";
import multer from "../shims/multer.js";
import prisma from "./prisma.js";
import { getFile, putFile, deleteFile, placeholderPdf } from "../runtime/files.js";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 10;

const startsWith = (b, bytes) => bytes.every((x, i) => b[i] === x);
const SIGNATURES = [
  { mime: "application/pdf", ext: "pdf", test: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  { mime: "image/png", ext: "png", test: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { mime: "image/jpeg", ext: "jpg", test: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
];
const ALLOWED_EXT = /\.(pdf|jpe?g|png)$/i;

export const sniff = (buffer) =>
  buffer && buffer.length > 8 ? SIGNATURES.find((s) => s.test(buffer)) || null : null;

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
});

export const acceptFiles = (handler) => (req, res, next) =>
  handler(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `Each file must be ${MAX_FILE_BYTES / 1024 / 1024} MB or smaller.`
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
        ? `You can upload up to ${MAX_FILES} files at once.`
        : "The upload failed.";
    res.status(400).json({ message });
  });

export const validateFile = (file) => {
  if (!file?.buffer?.length) return "The file is empty.";
  if (!ALLOWED_EXT.test(file.originalname || "")) return `${file.originalname}: only PDF, JPG and PNG files are accepted.`;
  if (!sniff(file.buffer)) return `${file.originalname} isn't a valid PDF, JPG or PNG file.`;
  return null;
};

const safeName = (name = "file") =>
  String(name).split(/[\\/]/).pop().replace(/[^\w.\- ()]/g, "_").slice(0, 150) || "file";

export const storeDocument = async (file, { kind, uploadedById, ...links }) => {
  const type = sniff(file.buffer);
  const storageKey = `${randomBytes(24).toString("hex")}.${type.ext}`;
  await putFile(storageKey, file.buffer, type.mime);
  try {
    return await prisma.document.create({
      data: {
        kind,
        originalName: safeName(file.originalname),
        mimeType: type.mime,
        size: file.size,
        storageKey,
        sha256: createHash("sha256").update(file.buffer).digest("hex"),
        uploadedById: uploadedById ?? null,
        ...links,
      },
    });
  } catch (err) {
    await removeFile(storageKey);
    throw err;
  }
};

export const removeFile = async (storageKey) => {
  try {
    await deleteFile(storageKey);
  } catch {
    // already gone
  }
};

export const deleteDocuments = async (where) => {
  const docs = await prisma.document.findMany({ where, select: { id: true, storageKey: true } });
  if (!docs.length) return 0;
  await prisma.document.deleteMany({ where: { id: { in: docs.map((d) => d.id) } } });
  await Promise.all(docs.map((d) => removeFile(d.storageKey)));
  return docs.length;
};

// Sends the file's bytes; seeded documents get a generated placeholder PDF.
export const sendDocument = async (res, doc, { download = false } = {}) => {
  let bytes = await getFile(doc.storageKey).catch(() => null);
  let mime = doc.mimeType;
  if (!bytes) {
    bytes = placeholderPdf(doc.originalName, doc.kind);
    mime = "application/pdf";
  }
  const disposition = download ? "attachment" : "inline";
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `${disposition}; filename="${doc.originalName.replace(/"/g, "")}"`);
  res.status(200).send(bytes);
};

export const publicDocument = ({ storageKey, sha256, ...doc }) => doc;
