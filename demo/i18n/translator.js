// Dictionary lookup used in the browser (index.js) and by scripts/i18n-check.mjs.
//
// A dictionary is { strings: { "English": "Français" }, patterns: [[/^regex$/, replacement]] }.
// A replacement is a string where $1..$9 are the captured groups (each one is
// translated before it is inserted), or a function (match, translate) => string.

const HAS_LETTER = /\p{L}/u;
// leading symbols, core, trailing symbols ("· updated", "Price:", "(optional)")
const EDGES = /^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u;
// French puts a space before these
const frenchEdge = (tail) => (/^[:?!;]/.test(tail) ? `\u00a0${tail}` : tail);

export function createTranslator(dicts) {
  const strings = new Map();
  const patterns = [];
  for (const dict of dicts) {
    if (!dict) continue;
    for (const [en, fr] of Object.entries(dict.strings || {})) strings.set(en, fr);
    patterns.push(...(dict.patterns || []));
  }
  const cache = new Map();
  const misses = new Set();
  // Our own output comes back through the observer: not a miss
  const french = new Set(strings.values());

  const lookup = (core) => {
    const exact = strings.get(core);
    if (exact !== undefined) return exact;
    for (const [re, to] of patterns) {
      re.lastIndex = 0;
      const m = re.exec(core);
      if (!m) continue;
      return typeof to === "function" ? to(m, translate) : to.replace(/\$(\d)/g, (_, i) => translate(m[i] ?? ""));
    }
    return null;
  };

  // The French for a piece of English text, or the text itself when unknown.
  // Surrounding whitespace is kept; inner whitespace runs count as one space.
  function translate(text) {
    if (typeof text !== "string" || !HAS_LETTER.test(text)) return text;
    const known = cache.get(text);
    if (known !== undefined) return known;

    const lead = /^\s*/.exec(text)[0];
    const trail = /\s*$/.exec(text)[0];
    const core = text.slice(lead.length, text.length - trail.length).replace(/\s+/g, " ");

    let out = lookup(core);
    if (out == null) {
      const m = EDGES.exec(core);
      if (m && m[2] && (m[1] || m[3])) {
        const inner = lookup(m[2]);
        if (inner != null) out = m[1] + inner + frenchEdge(m[3]);
      }
    }
    if (out == null && !french.has(core)) misses.add(core);
    const result = out == null ? text : lead + out + trail;
    if (cache.size > 8000) cache.clear();
    cache.set(text, result);
    return result;
  }

  return { translate, misses, size: strings.size };
}
