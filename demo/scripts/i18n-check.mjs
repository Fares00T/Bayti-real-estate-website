// Lists the English text of the three apps that has no French in demo/i18n/fr.
// Run it after copying changed pages from the production apps:
//   node scripts/i18n-check.mjs            text written in JSX (certain to be shown)
//   node scripts/i18n-check.mjs --all      also strings in code that look like text (labels, messages)
//   node scripts/i18n-check.mjs --seed     demo data without a translation
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, relative } from "node:path";
import { createTranslator } from "../i18n/translator.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(join(root, "client", "package.json"));
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const load = async (name) => (await import(pathToFileURL(join(root, "i18n", "fr", name)).href));
const common = (await load("common.js")).default;
const server = (await load("server.js")).default;
const seed = await load("seed.js");

const APPS = {
  client: ["client-components.js", "client-routes.js"],
  agency: ["agency.js"],
  admin: ["admin.js"],
};

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(jsx?|mjs)$/.test(name) ? [path] : [];
  });

// Attributes and props whose value is shown to the visitor
const TEXT_PROPS = /^(placeholder|title|alt|aria-label|label|helperText|subtitle|hint|description|emptyText|empty|confirmLabel|cancelLabel|message|text|heading|caption|tooltip|note)$/;
// Strings in code: keep what reads like text, drop URLs, paths, CSS and class names
const NOT_TEXT = /^(https?:|\/|\.{1,2}\/|#|@)|[{}<>=]|\dpx\b|\brgba?\(|^[a-z0-9_-]+( [a-z0-9_-]+)*$|^[\w-]+\/[\w.+-]+$/;
const looksLikeText = (s) => /\p{L}{2}/u.test(s) && (/^[A-Z][a-z]/.test(s) || /\s/.test(s)) && !NOT_TEXT.test(s);

const all = process.argv.includes("--all");
let missing = 0;

if (process.argv.includes("--seed")) {
  const { buildSeed } = await import(pathToFileURL(join(root, "server", "seed.js")).href);
  const known = new Set([...Object.keys(seed.content), ...Object.keys(seed.display)]);
  const fields = new Set(seed.FIELDS);
  const seen = new Set();
  const walk = (model, key, v) => {
    if (typeof v === "string") {
      if (fields.has(`${model}.${key}`) && v.trim() && !known.has(v) && !seen.has(v)) {
        seen.add(v);
        console.log(`${model}.${key}: ${JSON.stringify(v).slice(0, 140)}`);
      }
    } else if (Array.isArray(v)) v.forEach((x) => walk(model, key, x));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(model, key ? `${key}.${k}` : k, x);
  };
  for (const [model, rows] of Object.entries(buildSeed())) rows.forEach((r) => walk(model, "", r));
  console.log(`\n${seen.size} seed text(s) without French.`);
  process.exit(seen.size ? 1 : 0);
}

for (const [app, names] of Object.entries(APPS)) {
  const dicts = [common, server, { strings: seed.display }];
  for (const name of names) dicts.push((await load(name)).default);
  const { translate, misses } = createTranslator(dicts);
  const found = new Map(); // text -> first place
  const check = (text, file, line, kind) => {
    const core = String(text).replace(/\s+/g, " ").trim();
    if (!/\p{L}{2}/u.test(core)) return;
    translate(core);
    if (misses.has(core) && !found.has(core)) found.set(core, `${relative(root, file).replace(/\\/g, "/")}:${line} ${kind}`);
  };

  for (const file of files(join(root, app, "src"))) {
    let ast;
    try {
      ast = parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] });
    } catch (err) {
      console.error(`could not parse ${file}: ${err.message}`);
      continue;
    }
    traverse(ast, {
      JSXText(path) {
        check(path.node.value, file, path.node.loc.start.line, "text");
      },
      JSXAttribute(path) {
        const name = path.node.name.name;
        const value = path.node.value;
        if (value?.type === "StringLiteral" && TEXT_PROPS.test(name)) check(value.value, file, value.loc.start.line, name);
      },
      StringLiteral(path) {
        const { parent, node } = path;
        if (parent.type === "JSXAttribute" || parent.type === "ImportDeclaration") return;
        // text written as an expression in JSX: {open ? "Hide" : "Show"}
        const inJsx = path.findParent((p) => p.isJSXExpressionContainer() || p.isCallExpression() || p.isJSXAttribute());
        const shown = inJsx?.isJSXExpressionContainer() && inJsx.parent.type !== "JSXAttribute";
        if (shown && /\p{L}{2}/u.test(node.value) && (/\s/.test(node.value) || /^[A-Z]/.test(node.value))) {
          check(node.value, file, node.loc.start.line, "expr");
        } else if (all) {
          if (parent.type === "ObjectProperty" && parent.key === node) return;
          if (parent.type === "BinaryExpression" || parent.type === "SwitchCase" || parent.type === "MemberExpression") return;
          if (looksLikeText(node.value)) check(node.value, file, node.loc.start.line, "code");
        }
      },
      TemplateLiteral(path) {
        if (!all || path.node.expressions.length) return;
        const text = path.node.quasis[0].value.cooked;
        if (text && looksLikeText(text)) check(text, file, path.node.loc.start.line, "code");
      },
    });
  }

  console.log(`\n=== ${app}: ${found.size} without French`);
  for (const [text, where] of found) console.log(`${where}\t${JSON.stringify(text)}`);
  missing += found.size;
}

console.log(`\n${missing} text(s) without French.`);
