export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const toId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Trimmed string, or null when empty. Caps length so nothing overflows VARCHAR(191).
export const str = (value, max = 190) => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
};

// Accepts "YYYY-MM-DD" (or an ISO string); returns a Date or null
export const dateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Copies the listed keys that are present in `body`, normalised by `fn`
export const pickWith = (body = {}, keys, fn = str) =>
  Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, fn(body[k])]));

export const omitPassword = ({ password, ...rest }) => rest;
