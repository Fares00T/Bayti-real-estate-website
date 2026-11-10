// In-memory, dependency-free stand-in for the Prisma client.
//
// Parses schema.prisma at runtime and serves the delegate API (findMany,
// create, update, groupBy, nested writes, referential actions, transactions)
// over a plain JSON store, so the Express controllers can run unchanged in a
// browser or in Node without a database.
//
//   const prisma = createPrisma({ schema, data, onChange });
//
// Store format: { ModelName: [row, ...] }. Rows hold scalar fields only;
// DateTime values are ISO strings, Json values plain JSON. `prisma.$data` is
// that store (JSON-serializable), `prisma.$replace(data)` swaps it.

const SCALAR_TYPES = new Set(["String", "Int", "Float", "Boolean", "DateTime", "Json", "BigInt", "Decimal", "Bytes"]);
const CLIENT_VERSION = "in-memory";

// ---------- errors ----------

export class PrismaClientKnownRequestError extends Error {
  constructor(message, { code, meta } = {}) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = code;
    this.meta = meta;
    this.clientVersion = CLIENT_VERSION;
  }
}

export class PrismaClientValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "PrismaClientValidationError";
    this.clientVersion = CLIENT_VERSION;
  }
}

const invalid = (msg) => new PrismaClientValidationError(msg);
const notFound = (msg, cause) =>
  new PrismaClientKnownRequestError(msg, { code: "P2025", meta: { modelName: undefined, cause } });

// ---------- small helpers ----------

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
const arr = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const clone = (v) =>
  v === null || v === undefined || typeof v !== "object"
    ? v
    : typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
const randomId = () =>
  (globalThis.crypto && globalThis.crypto.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
const nowIso = () => new Date().toISOString();

// ---------- schema parsing ----------

const stripComments = (src) =>
  src
    .split(/\r?\n/)
    .map((line) => {
      let inStr = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"' && line[i - 1] !== "\\") inStr = !inStr;
        else if (!inStr && c === "/" && line[i + 1] === "/") return line.slice(0, i);
      }
      return line;
    })
    .join("\n");

// Reads `@name(args)` / `@@name(args)` attributes from the rest of a line
const parseAttributes = (text) => {
  const attrs = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "@") {
      i++;
      continue;
    }
    const m = /^@@?[\w.]+/.exec(text.slice(i));
    if (!m) {
      i++;
      continue;
    }
    const name = m[0].replace(/^@+/, "");
    i += m[0].length;
    let args = null;
    if (text[i] === "(") {
      let depth = 0;
      let inStr = false;
      const start = i + 1;
      for (; i < text.length; i++) {
        const c = text[i];
        if (c === '"' && text[i - 1] !== "\\") inStr = !inStr;
        if (inStr) continue;
        if (c === "(") depth++;
        else if (c === ")") {
          depth--;
          if (depth === 0) break;
        }
      }
      args = text.slice(start, i);
      i++;
    }
    attrs.push({ name, args });
  }
  return attrs;
};

const listArg = (args, key) => {
  const m = new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`).exec(args || "");
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : null;
};

const parseDefault = (raw, type, enums) => {
  const v = raw.trim();
  if (/^autoincrement\(\s*\)$/.test(v)) return { kind: "autoincrement" };
  if (/^now\(\s*\)$/.test(v)) return { kind: "now" };
  if (/^(uuid|cuid|nanoid|ulid)\(.*\)$/.test(v)) return { kind: "uuid" };
  if (/^dbgenerated\(/.test(v)) return null;
  let value;
  if (v.startsWith('"')) value = JSON.parse(v);
  else if (v === "true" || v === "false") value = v === "true";
  else if (/^-?\d+(\.\d+)?$/.test(v)) value = Number(v);
  else if (v.startsWith("[")) value = v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean).map((s) => parseDefault(s, type, enums).value);
  else value = v; // enum value
  if (type === "Json" && typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      /* keep the string */
    }
  }
  return { kind: "value", value };
};

export const parseSchema = (source) => {
  const src = stripComments(source);
  const enums = {};
  const models = {};
  const blockRe = /\b(model|enum|type|view)\s+(\w+)\s*\{([^{}]*)\}/g;
  let m;
  const raw = [];
  while ((m = blockRe.exec(src))) {
    const [, kind, name, body] = m;
    if (kind === "enum") {
      enums[name] = body
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("@@"))
        .map((l) => l.split(/\s+/)[0]);
    } else if (kind === "model") raw.push({ name, body });
  }

  for (const { name, body } of raw) {
    const model = {
      name,
      delegate: lowerFirst(name),
      fields: [],
      fieldMap: {},
      scalars: [],
      rels: {},
      uniques: [],
      compound: {},
      idFields: [],
    };
    for (const lineRaw of body.split(/\r?\n/)) {
      const line = lineRaw.trim();
      if (!line) continue;
      if (line.startsWith("@@")) {
        for (const a of parseAttributes(line)) {
          if (a.name === "id" || a.name === "unique") {
            const fields = listArg(`fields: ${a.args.trim().startsWith("[") ? a.args : ""}`, "fields") || listArg(a.args, "fields");
            const nameM = /name\s*:\s*"([^"]+)"/.exec(a.args || "");
            const key = nameM ? nameM[1] : fields.join("_");
            model.uniques.push({ name: key, fields });
            if (fields.length > 1) model.compound[key] = fields;
            if (a.name === "id") model.idFields = fields;
          }
        }
        continue;
      }
      const fm = /^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/.exec(line);
      if (!fm) continue;
      const [, fname, type, list, opt, rest] = fm;
      const attrs = parseAttributes(rest);
      const field = {
        name: fname,
        type,
        isList: Boolean(list),
        isOptional: Boolean(opt),
        kind: SCALAR_TYPES.has(type) ? "scalar" : enums[type] ? "enum" : "object",
        isId: false,
        isUnique: false,
        default: null,
        updatedAt: false,
      };
      for (const a of attrs) {
        if (a.name === "id") field.isId = true;
        else if (a.name === "unique") field.isUnique = true;
        else if (a.name === "updatedAt") field.updatedAt = true;
        else if (a.name === "default") field.default = parseDefault(a.args, type, enums);
        else if (a.name === "relation") {
          const args = a.args || "";
          const nameM = /^\s*"([^"]+)"/.exec(args) || /name\s*:\s*"([^"]+)"/.exec(args);
          field.relationName = nameM ? nameM[1] : undefined;
          field.relFields = listArg(args, "fields");
          field.relRefs = listArg(args, "references");
          const od = /onDelete\s*:\s*(\w+)/.exec(args);
          field.onDelete = od ? od[1] : undefined;
        }
      }
      model.fields.push(field);
      model.fieldMap[fname] = field;
      if (field.kind !== "object") model.scalars.push(fname);
      if (field.isId) {
        model.idFields = [fname];
        model.uniques.push({ name: fname, fields: [fname] });
      } else if (field.isUnique) model.uniques.push({ name: fname, fields: [fname] });
    }
    model.scalarFields = model.scalars.map((n) => model.fieldMap[n]);
    models[name] = model;
  }

  // Relations: pair each object field with its opposite side
  for (const model of Object.values(models)) {
    for (const f of model.fields) {
      if (f.kind !== "object") continue;
      const target = models[f.type];
      if (!target) throw new Error(`Unknown type ${f.type} on ${model.name}.${f.name}`);
      const opposite = target.fields.find(
        (g) => g.kind === "object" && g.type === model.name && g !== f && g.relationName === f.relationName
      );
      let rel;
      if (f.relFields) {
        rel = { owner: true, localKeys: f.relFields, foreignKeys: f.relRefs, onDelete: f.onDelete };
      } else {
        if (!opposite || !opposite.relFields) {
          throw new Error(`Can't resolve relation ${model.name}.${f.name}`);
        }
        rel = { owner: false, localKeys: opposite.relRefs, foreignKeys: opposite.relFields };
      }
      model.rels[f.name] = {
        ...rel,
        name: f.name,
        from: model.name,
        to: target.name,
        isList: f.isList,
        isOptional: f.isOptional,
      };
    }
    model.ownerRels = Object.values(model.rels).filter((r) => r.owner);
    model.listRels = Object.values(model.rels).filter((r) => r.isList).map((r) => r.name);
  }
  // Who points at each model (for referential actions on delete)
  for (const model of Object.values(models)) model.inbound = [];
  for (const model of Object.values(models)) {
    for (const rel of model.ownerRels) {
      const optional = rel.localKeys.every((k) => model.fieldMap[k].isOptional);
      // Prisma's defaults: SetNull for optional relations; Restrict for
      // required ones, which is relaxed here to "leave it"
      const onDelete = rel.onDelete || (optional ? "SetNull" : "NoAction");
      models[rel.to].inbound.push({ model: model.name, rel, onDelete });
    }
  }
  return { models, enums };
};

// ---------- the client ----------

export function createPrisma({ schema, data = null, onChange } = {}) {
  const parsed = typeof schema === "string" ? parseSchema(schema) : schema;
  const { models, enums } = parsed;
  const modelNames = Object.keys(models);
  const byDelegate = Object.fromEntries(modelNames.map((n) => [models[n].delegate, models[n]]));

  const store = {};
  let counters = {};

  const notify = () => {
    if (!onChange) return;
    try {
      onChange();
    } catch (err) {
      console.error("prisma onChange failed:", err);
    }
  };

  // ---------- values ----------

  const toStore = (model, f, v) => {
    if (v === null) return null;
    if (f.isList) return arr(v).map((x) => toStore(model, { ...f, isList: false }, x));
    const bad = () => invalid(`Invalid value for ${model.name}.${f.name}: ${JSON.stringify(v)} (expected ${f.type}).`);
    if (f.kind === "enum") {
      if (!enums[f.type].includes(v)) throw bad();
      return v;
    }
    switch (f.type) {
      case "DateTime": {
        const d = v instanceof Date ? v : typeof v === "string" || typeof v === "number" ? new Date(v) : null;
        if (!d || Number.isNaN(d.getTime())) throw bad();
        return d.toISOString();
      }
      case "Json":
        return clone(v);
      case "Int":
      case "BigInt":
        if (typeof v === "bigint") return Number(v);
        if (typeof v !== "number" || !Number.isInteger(v)) throw bad();
        return v;
      case "Float":
      case "Decimal":
        if (typeof v !== "number") throw bad();
        return v;
      case "Boolean":
        if (typeof v !== "boolean") throw bad();
        return v;
      case "String":
        if (typeof v !== "string") throw bad();
        return v;
      default:
        return v;
    }
  };

  const toOut = (f, v) => {
    if (v === null || v === undefined) return null;
    if (f.type === "DateTime") return f.isList ? v.map((x) => new Date(x)) : new Date(v);
    if (f.type === "Json" || f.isList) return clone(v);
    return v;
  };

  // Comparable form of a stored or user-supplied value
  const norm = (f, v) => {
    if (v === null || v === undefined) return null;
    if (f && f.type === "DateTime") return (v instanceof Date ? v : new Date(v)).getTime();
    if (v instanceof Date) return v.getTime();
    return v;
  };

  const eqv = (f, a, b, ci) => {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    if (f.type === "Json") return JSON.stringify(a) === JSON.stringify(b);
    const x = norm(f, a);
    const y = norm(f, b);
    if (ci && typeof x === "string" && typeof y === "string") return x.toLowerCase() === y.toLowerCase();
    return x === y;
  };

  // Unique keys compare like MySQL's case-insensitive collation
  const keyEq = (a, b) =>
    typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : a === b;

  // ---------- defaults & loading ----------

  const nextId = (model, f) => {
    const key = `${model.name}.${f.name}`;
    counters[key] = (counters[key] || 0) + 1;
    return counters[key];
  };
  const bumpCounter = (model, f, v) => {
    const key = `${model.name}.${f.name}`;
    if (typeof v === "number" && v > (counters[key] || 0)) counters[key] = v;
  };

  const defaultFor = (model, f) => {
    const d = f.default;
    if (d) {
      if (d.kind === "autoincrement") return nextId(model, f);
      if (d.kind === "now") return nowIso();
      if (d.kind === "uuid") return randomId();
      if (d.kind === "value") return f.type === "DateTime" ? new Date(d.value).toISOString() : clone(d.value);
    }
    if (f.updatedAt) return nowIso();
    if (f.isList) return [];
    if (f.isOptional) return null;
    return undefined;
  };

  const load = (input) => {
    counters = {};
    for (const name of modelNames) {
      const model = models[name];
      const src = (input && Array.isArray(input[name]) && input[name]) || [];
      for (const f of model.scalarFields) {
        if (f.default?.kind === "autoincrement") for (const r of src) bumpCounter(model, f, r?.[f.name]);
      }
      store[name] = src.map((r, i) => {
        const row = {};
        for (const f of model.scalarFields) {
          const v = r?.[f.name];
          if (v === undefined) {
            const d = defaultFor(model, f);
            if (d === undefined) {
              throw invalid(`Seed data: ${name}[${i}] is missing the required field "${f.name}".`);
            }
            row[f.name] = d;
          } else row[f.name] = toStore(model, f, v);
        }
        return row;
      });
    }
  };

  // ---------- snapshots (atomic writes and transactions) ----------

  const snapshot = () => ({
    rows: Object.fromEntries(modelNames.map((n) => [n, store[n].slice()])),
    counters: { ...counters },
  });
  const restore = (snap) => {
    for (const n of modelNames) store[n] = snap.rows[n];
    counters = snap.counters;
  };

  // ---------- locating rows ----------

  const sameRow = (model, a, b) =>
    model.idFields.length ? model.idFields.every((k) => a[k] === b[k]) : a === b;
  const locate = (model, row) => {
    const rows = store[model.name];
    const i = rows.indexOf(row);
    return i >= 0 ? i : rows.findIndex((r) => sameRow(model, r, row));
  };
  const fresh = (model, row) => {
    const i = locate(model, row);
    return i >= 0 ? store[model.name][i] : row;
  };
  const replaceRow = (model, oldRow, next) => {
    const i = locate(model, oldRow);
    if (i >= 0) store[model.name][i] = next;
  };
  const removeRow = (model, row) => {
    const i = locate(model, row);
    if (i >= 0) store[model.name].splice(i, 1);
  };

  const related = (rel, row) => {
    const vals = rel.localKeys.map((k) => row[k]);
    if (vals.some((v) => v === null || v === undefined)) return [];
    return store[rel.to].filter((r) => rel.foreignKeys.every((k, i) => r[k] === vals[i]));
  };

  // ---------- filtering ----------

  const FILTER_OPS = new Set([
    "equals", "in", "notIn", "not", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith",
    "mode", "search", "has", "hasSome", "hasEvery", "isEmpty",
  ]);
  const isFilter = (f, cond) =>
    isPlainObject(cond) && (f.type !== "Json" || Object.keys(cond).some((k) => FILTER_OPS.has(k)));

  const compare = (x, y) => {
    if (typeof x === "string" && typeof y === "string") {
      const a = x.toLowerCase();
      const b = y.toLowerCase();
      return a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0;
    }
    return x < y ? -1 : x > y ? 1 : 0;
  };

  const matchScalar = (model, f, val, cond) => {
    if (cond === null) return val === null || val === undefined;
    if (!isFilter(f, cond)) {
      if (f.isList) return JSON.stringify(val) === JSON.stringify(cond);
      return eqv(f, val, cond);
    }
    const ci = cond.mode === "insensitive";
    for (const op of Object.keys(cond)) {
      const x = cond[op];
      if (x === undefined || op === "mode") continue;
      switch (op) {
        case "equals":
          if (x === null ? val !== null && val !== undefined : !eqv(f, val, x, ci)) return false;
          break;
        case "in":
          if (val === null || val === undefined || !arr(x).some((y) => eqv(f, val, y, ci))) return false;
          break;
        case "notIn":
          if (val === null || val === undefined || arr(x).some((y) => eqv(f, val, y, ci))) return false;
          break;
        case "not":
          if (x === null) {
            if (val === null || val === undefined) return false;
          } else if (isFilter(f, x)) {
            if (val === null || val === undefined || matchScalar(model, f, val, x)) return false;
          } else if (val === null || val === undefined || eqv(f, val, x, ci)) return false;
          break;
        case "lt":
        case "lte":
        case "gt":
        case "gte": {
          if (val === null || val === undefined || x === null) return false;
          const c = compare(norm(f, val), norm(f, x));
          if (op === "lt" && !(c < 0)) return false;
          if (op === "lte" && !(c <= 0)) return false;
          if (op === "gt" && !(c > 0)) return false;
          if (op === "gte" && !(c >= 0)) return false;
          break;
        }
        case "contains":
        case "search":
        case "startsWith":
        case "endsWith": {
          if (val === null || val === undefined) return false;
          // MySQL's default collation compares text case-insensitively
          const s = String(val).toLowerCase();
          const t = String(x).toLowerCase();
          if (op === "startsWith" ? !s.startsWith(t) : op === "endsWith" ? !s.endsWith(t) : !s.includes(t)) return false;
          break;
        }
        case "has":
          if (!Array.isArray(val) || !val.some((y) => eqv(f, y, x))) return false;
          break;
        case "hasSome":
          if (!Array.isArray(val) || !x.some((z) => val.some((y) => eqv(f, y, z)))) return false;
          break;
        case "hasEvery":
          if (!Array.isArray(val) || !x.every((z) => val.some((y) => eqv(f, y, z)))) return false;
          break;
        case "isEmpty":
          if (!Array.isArray(val) || (val.length === 0) !== x) return false;
          break;
        default:
          throw invalid(`Unsupported filter \`${op}\` on ${model.name}.${f.name}.`);
      }
    }
    return true;
  };

  const matchRel = (rel, row, cond) => {
    const target = models[rel.to];
    const rows = related(rel, row);
    if (rel.isList) {
      if (!isPlainObject(cond)) throw invalid(`Invalid filter on list relation ${rel.from}.${rel.name}.`);
      for (const op of Object.keys(cond)) {
        const w = cond[op];
        if (w === undefined) continue;
        if (op === "some") {
          if (!rows.some((r) => matches(target, r, w))) return false;
        } else if (op === "every") {
          if (!rows.every((r) => matches(target, r, w))) return false;
        } else if (op === "none") {
          if (rows.some((r) => matches(target, r, w))) return false;
        } else throw invalid(`Unsupported list relation filter \`${op}\` on ${rel.from}.${rel.name}.`);
      }
      return true;
    }
    const r = rows[0] || null;
    if (cond === null) return r === null;
    if (isPlainObject(cond) && ("is" in cond || "isNot" in cond)) {
      if (cond.is !== undefined && (cond.is === null ? r !== null : !(r && matches(target, r, cond.is)))) return false;
      if (cond.isNot !== undefined && (cond.isNot === null ? r === null : r && matches(target, r, cond.isNot))) return false;
      return true;
    }
    return Boolean(r) && matches(target, r, cond);
  };

  const matches = (model, row, where) => {
    if (!where) return true;
    for (const key of Object.keys(where)) {
      const cond = where[key];
      if (cond === undefined) continue;
      if (key === "AND") {
        if (!arr(cond).every((w) => matches(model, row, w))) return false;
        continue;
      }
      if (key === "OR") {
        if (!arr(cond).some((w) => matches(model, row, w))) return false;
        continue;
      }
      if (key === "NOT") {
        if (arr(cond).some((w) => matches(model, row, w))) return false;
        continue;
      }
      const compound = model.compound[key];
      if (compound) {
        if (!isPlainObject(cond)) throw invalid(`Invalid value for ${model.name}.${key}.`);
        if (!compound.every((k) => eqv(model.fieldMap[k], row[k], cond[k]))) return false;
        continue;
      }
      const f = model.fieldMap[key];
      if (!f) throw invalid(`Unknown argument \`${key}\` in the where clause of ${model.name}.`);
      if (f.kind === "object") {
        if (!matchRel(model.rels[key], row, cond)) return false;
      } else if (!matchScalar(model, f, row[key], cond)) return false;
    }
    return true;
  };

  // ---------- ordering & pagination ----------

  // Turns one orderBy entry into comparable getters
  const orderSpecs = (model, key, dir, path = (r) => r) => {
    if (dir === undefined) return [];
    if (key === "_relevance") return [];
    const f = model.fieldMap[key];
    if (!f) throw invalid(`Unknown field \`${key}\` in orderBy of ${model.name}.`);
    if (f.kind === "object") {
      const rel = model.rels[key];
      if (rel.isList) {
        if (!isPlainObject(dir) || !dir._count) throw invalid(`Order by ${model.name}.${key} needs _count.`);
        return [{ get: (r) => { const x = path(r); return x ? related(rel, x).length : null; }, sort: dir._count }];
      }
      const target = models[rel.to];
      const step = (r) => { const x = path(r); return x ? related(rel, x)[0] || null : null; };
      return Object.entries(dir).flatMap(([k2, d2]) => orderSpecs(target, k2, d2, step));
    }
    const { sort, nulls } = typeof dir === "string" ? { sort: dir } : dir;
    return [{ get: (r) => { const x = path(r); return x ? norm(f, x[key]) : null; }, sort, nulls }];
  };

  const sortRows = (model, rows, orderBy) => {
    const specs = arr(orderBy).flatMap((o) => Object.entries(o || {}).flatMap(([k, d]) => orderSpecs(model, k, d)));
    if (!specs.length) return rows;
    return rows.slice().sort((a, b) => {
      for (const s of specs) {
        const x = s.get(a);
        const y = s.get(b);
        const desc = s.sort === "desc";
        let c;
        if (x === null && y === null) c = 0;
        else if (x === null || y === null) {
          // MySQL: nulls come first ascending, last descending
          const nullsFirst = s.nulls ? s.nulls === "first" : !desc;
          c = (x === null ? -1 : 1) * (nullsFirst ? 1 : -1);
          if (c) return c;
          continue;
        } else c = compare(x, y);
        if (c) return desc ? -c : c;
      }
      return 0;
    });
  };

  const findRows = (model, args = {}, source = store[model.name]) => {
    let rows = source.filter((r) => matches(model, r, args.where));
    rows = sortRows(model, rows, args.orderBy);
    if (args.distinct) {
      const keys = arr(args.distinct);
      const seen = new Set();
      rows = rows.filter((r) => {
        const sig = JSON.stringify(keys.map((k) => r[k]));
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
    }
    const take = args.take;
    if (args.cursor) {
      const i = rows.findIndex((r) => matches(model, r, args.cursor));
      if (i < 0) return [];
      rows = take !== undefined && take < 0 ? rows.slice(0, i + 1) : rows.slice(i);
    }
    const skip = args.skip || 0;
    if (take !== undefined && take !== null && take < 0) {
      const end = rows.length - skip;
      return rows.slice(Math.max(0, end + take), Math.max(0, end));
    }
    rows = rows.slice(skip);
    if (take !== undefined && take !== null) rows = rows.slice(0, take);
    return rows;
  };

  // ---------- projection ----------

  const countRelations = (model, row, spec) => {
    const sel = spec === true ? Object.fromEntries(model.listRels.map((n) => [n, true])) : spec?.select || {};
    const out = {};
    for (const [k, v] of Object.entries(sel)) {
      if (!v) continue;
      const rel = model.rels[k];
      if (!rel || !rel.isList) throw invalid(`Can't count ${model.name}.${k}.`);
      const rows = related(rel, row);
      out[k] = v === true || !v.where ? rows.length : rows.filter((r) => matches(models[rel.to], r, v.where)).length;
    }
    return out;
  };

  const loadRelation = (rel, row, spec) => {
    const target = models[rel.to];
    const args = spec === true ? {} : spec;
    const rows = related(rel, row);
    if (rel.isList) return findRows(target, args, rows).map((r) => project(target, r, args));
    const r = rows[0];
    return r ? project(target, r, args) : null;
  };

  const project = (model, row, args = {}) => {
    const out = {};
    const { select, include, omit } = args || {};
    if (select) {
      for (const [k, v] of Object.entries(select)) {
        if (!v) continue;
        if (k === "_count") {
          out._count = countRelations(model, row, v);
          continue;
        }
        const f = model.fieldMap[k];
        if (!f) throw invalid(`Unknown field \`${k}\` in select of ${model.name}.`);
        out[k] = f.kind === "object" ? loadRelation(model.rels[k], row, v) : toOut(f, row[k]);
      }
      return out;
    }
    for (const f of model.scalarFields) if (!(omit && omit[f.name])) out[f.name] = toOut(f, row[f.name]);
    if (include) {
      for (const [k, v] of Object.entries(include)) {
        if (!v) continue;
        if (k === "_count") {
          out._count = countRelations(model, row, v);
          continue;
        }
        const rel = model.rels[k];
        if (!rel) throw invalid(`Unknown relation \`${k}\` in include of ${model.name}.`);
        out[k] = loadRelation(rel, row, v);
      }
    }
    return out;
  };

  // ---------- integrity ----------

  const checkUnique = (model, row, oldRow) => {
    for (const u of model.uniques) {
      const vals = u.fields.map((k) => row[k]);
      if (vals.some((v) => v === null || v === undefined)) continue;
      if (oldRow && u.fields.every((k) => keyEq(oldRow[k], row[k]))) continue;
      const clash = store[model.name].some(
        (r) => r !== oldRow && !(oldRow && sameRow(model, r, oldRow)) && u.fields.every((k, i) => keyEq(r[k], vals[i]))
      );
      if (clash) {
        throw new PrismaClientKnownRequestError(
          `Unique constraint failed on the fields: (${u.fields.map((k) => `\`${k}\``).join(",")})`,
          { code: "P2002", meta: { modelName: model.name, target: u.fields } }
        );
      }
    }
  };

  const checkForeignKeys = (model, row, oldRow) => {
    for (const rel of model.ownerRels) {
      const vals = rel.localKeys.map((k) => row[k]);
      if (vals.some((v) => v === null || v === undefined)) continue;
      if (oldRow && rel.localKeys.every((k) => oldRow[k] === row[k])) continue;
      if (!store[rel.to].some((r) => rel.foreignKeys.every((k, i) => r[k] === vals[i]))) {
        throw new PrismaClientKnownRequestError(
          `Foreign key constraint violated: \`${model.name}_${rel.localKeys.join("_")}_fkey (index)\``,
          { code: "P2003", meta: { modelName: model.name, field_name: `${model.name}_${rel.localKeys.join("_")}_fkey (index)` } }
        );
      }
    }
  };

  // ---------- writes ----------

  const findOne = (model, where) => store[model.name].find((r) => matches(model, r, where)) || null;

  const requireWhere = (model, where, op) => {
    if (!isPlainObject(where) || !Object.values(where).some((v) => v !== undefined)) {
      throw invalid(`${model.name}.${op}() needs a \`where\` with at least one defined value.`);
    }
  };

  const unwrapToOneUpdate = (arg) =>
    isPlainObject(arg) && isPlainObject(arg.data) && Object.keys(arg).every((k) => k === "data" || k === "where")
      ? arg.data
      : arg;

  // A relation whose foreign key lives on this row (e.g. Post.user)
  const ownerNested = (model, rel, draft, ops, currentRow) => {
    const target = models[rel.to];
    const setFk = (t) => rel.localKeys.forEach((k, i) => (draft[k] = t ? t[rel.foreignKeys[i]] : null));
    const current = () => (currentRow ? related(rel, currentRow)[0] || null : null);
    if (!isPlainObject(ops)) throw invalid(`Invalid nested write on ${model.name}.${rel.name}.`);
    for (const [op, arg] of Object.entries(ops)) {
      if (arg === undefined) continue;
      switch (op) {
        case "connect": {
          const t = findOne(target, arg);
          if (!t) throw notFound(`No '${target.name}' record was found for a nested connect on ${model.name}.${rel.name}.`);
          setFk(t);
          break;
        }
        case "create":
          setFk(createRow(target, arg));
          break;
        case "connectOrCreate":
          setFk(findOne(target, arg.where) || createRow(target, arg.create));
          break;
        case "disconnect":
          if (arg) setFk(null);
          break;
        case "update": {
          const t = current();
          if (!t) throw notFound(`No '${target.name}' record to update on ${model.name}.${rel.name}.`);
          updateRow(target, t, unwrapToOneUpdate(arg));
          break;
        }
        case "upsert": {
          const t = current();
          if (t) updateRow(target, t, arg.update);
          else setFk(createRow(target, arg.create));
          break;
        }
        case "delete": {
          const t = current();
          if (!t) throw notFound(`No '${target.name}' record to delete on ${model.name}.${rel.name}.`);
          setFk(null);
          deleteCascade(target, t);
          break;
        }
        default:
          throw invalid(`Unsupported nested write \`${op}\` on ${model.name}.${rel.name}.`);
      }
    }
  };

  // A relation whose foreign key lives on the other rows (e.g. Chat.users)
  const backNested = (model, rel, parent, ops) => {
    const target = models[rel.to];
    const fk = Object.fromEntries(rel.foreignKeys.map((k, i) => [k, parent[rel.localKeys[i]]]));
    const nullFk = Object.fromEntries(rel.foreignKeys.map((k) => [k, null]));
    const children = (w) => related(rel, parent).filter((c) => matches(target, c, w));
    const createChild = (d) => {
      // drop a connect back to the parent: the foreign key is set here
      const clean = { ...d };
      for (const [k, r] of Object.entries(target.rels)) if (r.to === model.name && r.owner && clean[k]) delete clean[k];
      return createRow(target, { ...clean, ...fk });
    };
    const connect = (w) => {
      const t = findOne(target, w);
      if (!t) throw notFound(`No '${target.name}' record was found for a nested connect on ${model.name}.${rel.name}.`);
      updateRow(target, t, fk);
    };
    if (!isPlainObject(ops)) throw invalid(`Invalid nested write on ${model.name}.${rel.name}.`);
    for (const [op, arg] of Object.entries(ops)) {
      if (arg === undefined) continue;
      switch (op) {
        case "create":
          arr(arg).forEach(createChild);
          break;
        case "createMany":
          for (const d of arr(arg.data)) {
            try {
              createChild(d);
            } catch (err) {
              if (!(arg.skipDuplicates && err.code === "P2002")) throw err;
            }
          }
          break;
        case "connect":
          arr(arg).forEach(connect);
          break;
        case "connectOrCreate":
          arr(arg).forEach(({ where, create }) => (findOne(target, where) ? connect(where) : createChild(create)));
          break;
        case "set":
          related(rel, parent).forEach((c) => updateRow(target, c, nullFk));
          arr(arg).forEach(connect);
          break;
        case "disconnect":
          if (rel.isList) arr(arg).forEach((w) => children(w).slice(0, 1).forEach((c) => updateRow(target, c, nullFk)));
          else if (arg) related(rel, parent).forEach((c) => updateRow(target, c, nullFk));
          break;
        case "update":
          if (rel.isList) {
            arr(arg).forEach(({ where, data: d }) => {
              const c = children(where)[0];
              if (!c) throw notFound(`No '${target.name}' record to update on ${model.name}.${rel.name}.`);
              updateRow(target, c, d);
            });
          } else {
            const c = related(rel, parent)[0];
            if (!c) throw notFound(`No '${target.name}' record to update on ${model.name}.${rel.name}.`);
            updateRow(target, c, unwrapToOneUpdate(arg));
          }
          break;
        case "updateMany":
          arr(arg).forEach(({ where, data: d }) => children(where).forEach((c) => updateRow(target, c, d)));
          break;
        case "upsert":
          if (rel.isList) {
            arr(arg).forEach(({ where, create, update }) => {
              const c = children(where)[0];
              if (c) updateRow(target, c, update);
              else createChild(create);
            });
          } else {
            const c = related(rel, parent)[0];
            if (c) updateRow(target, c, arg.update);
            else createChild(arg.create);
          }
          break;
        case "delete":
          if (rel.isList) {
            arr(arg).forEach((w) => {
              const c = children(w)[0];
              if (!c) throw notFound(`No '${target.name}' record to delete on ${model.name}.${rel.name}.`);
              deleteCascade(target, c);
            });
          } else if (arg) {
            const c = related(rel, parent)[0];
            if (!c) throw notFound(`No '${target.name}' record to delete on ${model.name}.${rel.name}.`);
            deleteCascade(target, c);
          }
          break;
        case "deleteMany":
          (Array.isArray(arg) ? arg : [arg]).forEach((w) => children(w === true ? {} : w).forEach((c) => deleteCascade(target, c)));
          break;
        default:
          throw invalid(`Unsupported nested write \`${op}\` on ${model.name}.${rel.name}.`);
      }
    }
  };

  const createRow = (model, data) => {
    if (!isPlainObject(data)) throw invalid(`${model.name}.create() needs a \`data\` object.`);
    const row = {};
    const after = [];
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      const f = model.fieldMap[k];
      if (!f) throw invalid(`Unknown argument \`${k}\` in data for ${model.name}.`);
      if (f.kind === "object") {
        const rel = model.rels[k];
        if (rel.owner) ownerNested(model, rel, row, v, null);
        else after.push([rel, v]);
        continue;
      }
      const value = isPlainObject(v) && f.type !== "Json" && "set" in v ? v.set : v;
      row[k] = toStore(model, f, value);
      if (f.default?.kind === "autoincrement") bumpCounter(model, f, row[k]);
    }
    for (const f of model.scalarFields) {
      if (row[f.name] !== undefined) continue;
      const d = defaultFor(model, f);
      if (d === undefined) throw invalid(`Argument \`${f.name}\` is missing in ${model.name}.create().`);
      row[f.name] = d;
    }
    checkUnique(model, row, null);
    checkForeignKeys(model, row, null);
    store[model.name].push(row);
    for (const [rel, v] of after) backNested(model, rel, row, v);
    return fresh(model, row);
  };

  const scalarUpdate = (model, f, cur, v) => {
    if (!isPlainObject(v) || f.type === "Json") return toStore(model, f, v);
    let out = cur;
    for (const [op, x] of Object.entries(v)) {
      if (x === undefined) continue;
      if (op === "set") out = toStore(model, f, x);
      else if (["increment", "decrement", "multiply", "divide"].includes(op)) {
        if (typeof x !== "number") throw invalid(`Invalid ${op} on ${model.name}.${f.name}.`);
        if (out === null || out === undefined) continue; // NULL stays NULL
        out = op === "increment" ? out + x : op === "decrement" ? out - x : op === "multiply" ? out * x : out / x;
        if (f.type === "Int" || f.type === "BigInt") out = Math.trunc(out);
      } else if (op === "push" && f.isList) out = [...(out || []), ...arr(x)];
      else throw invalid(`Unsupported update operation \`${op}\` on ${model.name}.${f.name}.`);
    }
    return out;
  };

  const updateRow = (model, row, data) => {
    if (!isPlainObject(data)) throw invalid(`${model.name}.update() needs a \`data\` object.`);
    const next = { ...row };
    const after = [];
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      const f = model.fieldMap[k];
      if (!f) throw invalid(`Unknown argument \`${k}\` in data for ${model.name}.`);
      if (f.kind === "object") {
        const rel = model.rels[k];
        if (rel.owner) ownerNested(model, rel, next, v, row);
        else after.push([rel, v]);
        continue;
      }
      next[k] = scalarUpdate(model, f, row[k], v);
    }
    for (const f of model.scalarFields) if (f.updatedAt && data[f.name] === undefined) next[f.name] = nowIso();
    checkUnique(model, next, row);
    checkForeignKeys(model, next, row);
    replaceRow(model, row, next);
    for (const [rel, v] of after) backNested(model, rel, next, v);
    return fresh(model, next);
  };

  // Deletes a row and applies the referential actions of everything pointing at it
  const deleteCascade = (model, row, seen = new Set()) => {
    const current = fresh(model, row);
    if (locate(model, current) < 0) return;
    const sig = `${model.name}:${model.idFields.map((k) => current[k]).join(",")}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    for (const { model: depName, rel, onDelete } of model.inbound) {
      const dep = models[depName];
      const keys = rel.foreignKeys.map((k) => current[k]);
      if (keys.some((v) => v === null || v === undefined)) continue;
      const deps = store[depName].filter((r) => rel.localKeys.every((k, i) => r[k] === keys[i]));
      if (onDelete === "Cascade") deps.forEach((d) => deleteCascade(dep, d, seen));
      else if (onDelete === "SetNull") {
        deps.forEach((d) => {
          const cur = fresh(dep, d);
          if (locate(dep, cur) < 0) return;
          const next = { ...cur };
          rel.localKeys.forEach((k) => (next[k] = null));
          replaceRow(dep, cur, next);
        });
      }
      // NoAction / Restrict: left as is
    }
    removeRow(model, current);
  };

  // ---------- aggregates ----------

  const aggregateRows = (model, rows, args) => {
    const out = {};
    if (args._count) {
      out._count =
        args._count === true
          ? rows.length
          : Object.fromEntries(
              Object.entries(args._count)
                .filter(([, v]) => v)
                .map(([k]) => [k, k === "_all" ? rows.length : rows.filter((r) => r[k] !== null && r[k] !== undefined).length])
            );
    }
    for (const agg of ["_sum", "_avg", "_min", "_max"]) {
      if (!args[agg]) continue;
      out[agg] = {};
      for (const [k, on] of Object.entries(args[agg])) {
        if (!on) continue;
        const f = model.fieldMap[k];
        if (!f) throw invalid(`Unknown field \`${k}\` in ${agg} of ${model.name}.`);
        const vals = rows.map((r) => r[k]).filter((v) => v !== null && v !== undefined);
        if (!vals.length) {
          out[agg][k] = null;
          continue;
        }
        if (agg === "_sum") out[agg][k] = vals.reduce((n, v) => n + v, 0);
        else if (agg === "_avg") out[agg][k] = vals.reduce((n, v) => n + v, 0) / vals.length;
        else {
          const pick = vals.reduce((best, v) => {
            const c = compare(norm(f, v), norm(f, best));
            return (agg === "_min" ? c < 0 : c > 0) ? v : best;
          });
          out[agg][k] = toOut(f, pick);
        }
      }
    }
    return out;
  };

  const groupBy = (model, args) => {
    const by = arr(args.by);
    if (!by.length) throw invalid(`${model.name}.groupBy() needs \`by\`.`);
    const rows = store[model.name].filter((r) => matches(model, r, args.where));
    const groups = new Map();
    for (const r of rows) {
      const key = JSON.stringify(by.map((k) => norm(model.fieldMap[k], r[k])));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    let out = [...groups.values()].map((g) => {
      const o = {};
      for (const k of by) o[k] = toOut(model.fieldMap[k], g[0][k]);
      return Object.assign(o, aggregateRows(model, g, args));
    });
    if (args.having) throw invalid(`groupBy \`having\` isn't supported by the in-memory client.`);
    const specs = arr(args.orderBy).flatMap((o) =>
      Object.entries(o || {}).flatMap(([k, d]) => {
        if (k.startsWith("_")) {
          return Object.entries(d).map(([fk, fd]) => ({
            get: (x) => (k === "_count" && typeof x._count === "number" ? x._count : x[k]?.[fk] ?? null),
            sort: typeof fd === "string" ? fd : fd.sort,
            field: model.fieldMap[fk],
          }));
        }
        return [{ get: (x) => x[k], sort: typeof d === "string" ? d : d.sort, field: model.fieldMap[k] }];
      })
    );
    if (specs.length) {
      out = out.slice().sort((a, b) => {
        for (const s of specs) {
          const x = norm(s.field, s.get(a));
          const y = norm(s.field, s.get(b));
          let c;
          if (x === null && y === null) c = 0;
          else if (x === null) c = -1;
          else if (y === null) c = 1;
          else c = compare(x, y);
          if (c) return s.sort === "desc" ? -c : c;
        }
        return 0;
      });
    }
    if (args.skip) out = out.slice(args.skip);
    if (args.take !== undefined) out = out.slice(0, args.take);
    return out;
  };

  // ---------- raw queries ----------

  const DAILY_RE = /^\s*SELECT\s+DATE\((\w+)\)\s+AS\s+date\s*,\s*COUNT\(\*\)\s+AS\s+count\s+FROM\s+`?(\w+)`?\s+GROUP\s+BY\s+date\s+ORDER\s+BY\s+date\s+ASC\s*;?\s*$/i;

  const queryRawUnsafe = (sql) => {
    const m = DAILY_RE.exec(String(sql));
    if (!m || !models[m[2]]) return [];
    const [, field, name] = m;
    const counts = new Map();
    for (const r of store[name]) {
      if (!r[field]) continue;
      const day = String(r[field]).slice(0, 10);
      counts.set(day, (counts.get(day) || 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([day, count]) => ({ date: new Date(`${day}T00:00:00.000Z`), count }));
  };

  // The chat controller counts unread messages with two raw queries; they are
  // evaluated here. Anything else (row locks) returns no rows.
  const queryRaw = (strings, values) => {
    const sql = Array.isArray(strings) ? strings.join("?") : String(strings);
    if (!/AS\s+unread/i.test(sql) || !store.Message || !store.ChatUser || !store.Inquiry) return [];
    const ms = (v) => (v ? new Date(v).getTime() : null);
    const unread = (chatId, cu, isUnreadSender) => {
      const lastRead = cu ? ms(cu.lastReadAt) : null;
      return store.Message.filter(
        (m) => m.chatId === chatId && isUnreadSender(m) && (lastRead === null || ms(m.createdAt) > lastRead)
      ).length;
    };
    const rows = [];
    if (/^\s*SELECT\s+i\.chatId/i.test(sql)) {
      // agency side: [userId, agencyId, all, userId]
      const [userId, agencyId, all] = values;
      for (const i of store.Inquiry) {
        if (i.agencyId !== agencyId || i.chatId === null) continue;
        if (!(Number(all) === 1 || i.assignedToId === userId)) continue;
        const cu = store.ChatUser.find((c) => c.chatId === i.chatId && c.userId === userId) || null;
        const n = unread(i.chatId, cu, (m) => m.userId === i.clientId);
        if (n) rows.push({ chatId: i.chatId, unread: n });
      }
    } else {
      // marketplace side: [userId, userId]
      const [userId] = values;
      for (const cu of store.ChatUser) {
        if (cu.userId !== userId) continue;
        const i = store.Inquiry.find((x) => x.chatId === cu.chatId) || null;
        if (!(i === null || i.clientId === userId || i.agencyId === null)) continue;
        const n = unread(cu.chatId, cu, (m) => m.userId !== cu.userId);
        if (n) rows.push({ chatId: cu.chatId, unread: n });
      }
    }
    return rows;
  };

  // ---------- lazy promises & transactions ----------

  // Like Prisma, queries run when awaited, so $transaction([...]) can run
  // them in order inside one atomic unit
  const perform = (ctx, exec, write) => {
    if (!write) return exec();
    const snap = snapshot();
    let result;
    try {
      result = exec();
    } catch (err) {
      restore(snap);
      throw err;
    }
    if (ctx.inTx && !ctx.closed) ctx.dirty = true;
    else notify();
    return result;
  };

  const lazy = (ctx, exec, write) => {
    let promise = null;
    const run = (c = ctx) => promise || (promise = new Promise((resolve) => resolve(perform(c, exec, write))));
    return {
      then: (a, b) => run().then(a, b),
      catch: (b) => run().catch(b),
      finally: (f) => run().finally(f),
      [Symbol.toStringTag]: "PrismaPromise",
      __run: run,
    };
  };

  const makeDelegate = (model, ctx) => {
    const op = (fn, write = false) => (args = {}) => lazy(ctx, () => fn(args || {}), write);
    const findUniqueRow = (args, name) => {
      requireWhere(model, args.where, name);
      return findOne(model, args.where);
    };
    const orThrow = (row) => {
      if (!row) throw notFound(`No ${model.name} found`, "Expected a record, found none.");
      return row;
    };
    const first = (args) => findRows(model, args)[0] || null;
    const out = (row, args) => (row ? project(model, row, args) : null);
    const count = (args) => {
      const rows = findRows(model, args);
      if (isPlainObject(args.select)) {
        return Object.fromEntries(
          Object.entries(args.select)
            .filter(([, v]) => v)
            .map(([k]) => [k, k === "_all" ? rows.length : rows.filter((r) => r[k] !== null && r[k] !== undefined).length])
        );
      }
      return rows.length;
    };
    const update = (args) => {
      const row = findUniqueRow(args, "update");
      if (!row) throw notFound(`No record was found for an update on ${model.name}.`, "Record to update not found.");
      return out(updateRow(model, row, args.data), args);
    };
    const create = (args) => out(createRow(model, args.data), args);
    const createMany = (args) => {
      const rows = [];
      for (const d of arr(args.data)) {
        try {
          rows.push(createRow(model, d));
        } catch (err) {
          if (!(args.skipDuplicates && err.code === "P2002")) throw err;
        }
      }
      return rows;
    };

    return {
      findMany: op((a) => findRows(model, a).map((r) => project(model, r, a))),
      findFirst: op((a) => out(first(a), a)),
      findFirstOrThrow: op((a) => out(orThrow(first(a)), a)),
      findUnique: op((a) => out(findUniqueRow(a, "findUnique"), a)),
      findUniqueOrThrow: op((a) => out(orThrow(findUniqueRow(a, "findUniqueOrThrow")), a)),
      count: op(count),
      aggregate: op((a) => aggregateRows(model, findRows(model, a), a)),
      groupBy: op((a) => groupBy(model, a)),
      create: op(create, true),
      createMany: op((a) => ({ count: createMany(a).length }), true),
      createManyAndReturn: op((a) => createMany(a).map((r) => project(model, r, a)), true),
      update: op(update, true),
      updateMany: op((a) => {
        const rows = store[model.name].filter((r) => matches(model, r, a.where));
        rows.forEach((r) => updateRow(model, fresh(model, r), a.data));
        return { count: rows.length };
      }, true),
      upsert: op((a) => {
        const row = findUniqueRow(a, "upsert");
        return row ? out(updateRow(model, row, a.update), a) : out(createRow(model, a.create), a);
      }, true),
      delete: op((a) => {
        const row = findUniqueRow(a, "delete");
        if (!row) throw notFound(`No record was found for a delete on ${model.name}.`, "Record to delete does not exist.");
        const result = out(row, a);
        deleteCascade(model, row);
        return result;
      }, true),
      deleteMany: op((a) => {
        const rows = store[model.name].filter((r) => matches(model, r, a.where));
        rows.forEach((r) => deleteCascade(model, r));
        return { count: rows.length };
      }, true),
    };
  };

  const makeClient = (ctx) => {
    const client = {};
    for (const model of Object.values(models)) client[model.delegate] = makeDelegate(model, ctx);

    client.$transaction = async (arg) => {
      if (Array.isArray(arg)) {
        if (ctx.inTx) {
          const results = [];
          for (const item of arg) results.push(await (item && item.__run ? item.__run(ctx) : item));
          return results;
        }
        const tctx = { inTx: true, dirty: false, closed: false };
        const snap = snapshot();
        try {
          const results = [];
          for (const item of arg) results.push(await (item && item.__run ? item.__run(tctx) : item));
          tctx.closed = true;
          if (tctx.dirty) notify();
          return results;
        } catch (err) {
          tctx.closed = true;
          restore(snap);
          throw err;
        }
      }
      if (typeof arg !== "function") throw invalid("$transaction() takes an array of queries or a function.");
      if (ctx.inTx) return arg(client);
      const tctx = { inTx: true, dirty: false, closed: false };
      const tx = makeClient(tctx);
      const snap = snapshot();
      try {
        const result = await arg(tx);
        tctx.closed = true;
        if (tctx.dirty) notify();
        return result;
      } catch (err) {
        tctx.closed = true;
        restore(snap);
        throw err;
      }
    };
    client.$queryRaw = (strings, ...values) => lazy(ctx, () => queryRaw(strings, values), false);
    client.$queryRawUnsafe = (sql) => lazy(ctx, () => queryRawUnsafe(sql), false);
    client.$executeRaw = () => lazy(ctx, () => 0, false);
    client.$executeRawUnsafe = () => lazy(ctx, () => 0, false);
    client.$connect = async () => {};
    client.$disconnect = async () => {};
    client.$on = () => {};
    client.$use = () => {};
    client.$extends = () => client;
    Object.defineProperty(client, "$data", { get: () => store, enumerable: false });
    client.$replace = (next) => {
      load(next);
      notify();
    };
    client.$schema = parsed;
    return client;
  };

  load(data);
  return makeClient({ inTx: false });
}

export default createPrisma;
