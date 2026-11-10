// Tiny helper for applying exact-text patches regardless of line endings.
const fs = require("fs");
module.exports = (f, a, b) => {
  const raw = fs.readFileSync(f, "utf8");
  const crlf = raw.includes("\r\n");
  const s = raw.replace(/\r\n/g, "\n");
  if (!s.includes(a)) throw new Error("missing in " + f + ": " + a);
  const out = s.replace(a, b);
  fs.writeFileSync(f, crlf ? out.replace(/\n/g, "\r\n") : out);
};
