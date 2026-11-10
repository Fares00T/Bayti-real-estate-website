// French / English for the investor demo.
//
// The three apps are copies of the production apps, which are written in
// English, so instead of rewriting every page the demo translates at the
// edges:
//   - text, placeholders, titles and labels are translated as they reach the
//     page (a MutationObserver), using the dictionaries in ./fr;
//   - the demo data (listing titles, descriptions, messages...) is translated
//     in the API responses, and mapped back in what the apps send;
//   - dates follow the language.
// English is the source language: with "en" selected nothing here runs.
import { createTranslator } from "./translator.js";
import common from "./fr/common.js";
import server from "./fr/server.js";
import { content as seedContent, display as seedDisplay } from "./fr/seed.js";

export const LANGS = ["fr", "en"];
export const DEFAULT_LANG = "fr";
const LANG_KEY = "bayti_demo_lang";

const readLang = () => {
  let lang = null;
  try {
    // ?lang=en in a shared link picks the language once
    const url = new URL(window.location.href);
    const asked = url.searchParams.get("lang");
    if (LANGS.includes(asked)) {
      localStorage.setItem(LANG_KEY, asked);
      url.searchParams.delete("lang");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
    lang = localStorage.getItem(LANG_KEY);
  } catch {
    /* no storage: fall back to the default */
  }
  return LANGS.includes(lang) ? lang : DEFAULT_LANG;
};

const lang = typeof window === "undefined" ? "en" : readLang();
const french = lang === "fr";

export const getLang = () => lang;

// Data already loaded by the apps is in the old language, so start over
export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* ignore */
  }
  window.location.reload();
}

// ---------- dictionary ----------

let translator = null;

// Returns the French for a piece of English text, or the text itself when the
// dictionaries don't know it (or when the demo is in English).
export const translate = (text) => (translator ? translator.translate(text) : text);

// ---------- the page ----------

// "label" is the visible name of an <optgroup>
const ATTRS = ["placeholder", "title", "aria-label", "alt", "label"];
// Text in here belongs to the visitor (or to code), never translate it
const OFF_LIMITS = 'script,style,textarea,code,pre,[contenteditable=""],[contenteditable="true"],[data-no-i18n]';
const written = new WeakMap(); // text node -> the French we put there
const pinned = new WeakSet(); // <option>s whose value we fixed to their English text

const textOffLimits = (el) => !el || el.nodeType !== 1 || !!el.closest(OFF_LIMITS);
const attrsOffLimits = (el) => !!el.closest("[data-no-i18n]");

// An <option> without a value attribute uses its text as its value, and the
// apps compare that value with the data: keep the English one.
const pinOption = (option) => {
  if (!option.hasAttribute("value")) {
    option.setAttribute("value", option.text);
    pinned.add(option);
  } else if (pinned.has(option) && option.childNodes.length === 1) {
    option.setAttribute("value", option.text); // React rewrote its text
  }
};

const translateText = (node) => {
  const value = node.nodeValue;
  if (!value || written.get(node) === value) return;
  const out = translate(value);
  if (out === value) return;
  if (node.parentElement?.tagName === "OPTION") pinOption(node.parentElement);
  written.set(node, out);
  node.nodeValue = out;
};

const translateAttrs = (el) => {
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (!value || (name === "label" && el.tagName !== "OPTGROUP")) continue;
    const out = translate(value);
    if (out !== value) el.setAttribute(name, out);
  }
  if (el.tagName === "INPUT" && /^(button|submit|reset)$/.test(el.type) && el.value) {
    const out = translate(el.value);
    if (out !== el.value) el.value = out;
  }
};

const translateTree = (root) => {
  if (root.nodeType === 3) {
    if (!textOffLimits(root.parentElement)) translateText(root);
    return;
  }
  if (root.nodeType !== 1 || attrsOffLimits(root)) return;
  translateAttrs(root);
  if (textOffLimits(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType !== 1 || !n.matches(OFF_LIMITS)) return NodeFilter.FILTER_ACCEPT;
      // a <textarea> keeps its text but its placeholder is ours
      if (!n.hasAttribute("data-no-i18n")) translateAttrs(n);
      return NodeFilter.FILTER_REJECT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === 3) translateText(n);
    else translateAttrs(n);
  }
};

const watchPage = () => {
  translateTree(document.documentElement);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "childList") r.addedNodes.forEach(translateTree);
      else if (r.type === "characterData") {
        if (!textOffLimits(r.target.parentElement)) translateText(r.target);
      } else if (!attrsOffLimits(r.target)) translateAttrs(r.target);
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
};

// The apps format dates with English locales ("en-GB", "en-US")
const frenchDates = () => {
  const fr = (locale) => {
    const first = Array.isArray(locale) ? locale[0] : locale;
    return first === undefined || /^en\b/i.test(String(first)) ? "fr-FR" : locale;
  };
  for (const method of ["toLocaleDateString", "toLocaleTimeString", "toLocaleString"]) {
    const original = Date.prototype[method];
    Date.prototype[method] = function (locale, options) {
      return original.call(this, fr(locale), options);
    };
  }
};

const frenchDialogs = () => {
  for (const name of ["alert", "confirm", "prompt"]) {
    const original = window[name].bind(window);
    window[name] = (message, ...rest) => original(translate(String(message ?? "")), ...rest);
  }
};

// Call once, before the app renders, with the app's own dictionaries
export function startI18n(...appDicts) {
  document.documentElement.lang = lang;
  if (!french) return;
  translator = createTranslator([common, server, { strings: seedDisplay }, ...appDicts, { strings: seedContent }]);
  frenchDates();
  frenchDialogs();
  watchPage();
  // For checking coverage from the console: texts that stayed in English
  window.__baytiI18n = { misses: translator.misses, translate };
}

// ---------- demo data (API responses and requests) ----------

const toFrench = new Map(Object.entries(seedContent));
const toEnglish = new Map([...toFrench].map(([en, fr]) => [fr, en]));

const isPlain = (v) => {
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};
const mapStrings = (value, map) => {
  if (typeof value === "string") return map.get(value) ?? value;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, map));
  if (value && typeof value === "object" && isPlain(value)) {
    const out = {};
    for (const key of Object.keys(value)) out[key] = mapStrings(value[key], map);
    return out;
  }
  return value;
};

// What the API answers: seeded English content -> French
export const localizeData = (data) => (french ? mapStrings(data, toFrench) : data);

// What the apps send: French shown from the seed -> the English it came from,
// so saving a form without touching a field leaves the data as it was
export function delocalizeRequest({ url, body }) {
  if (!french) return { url, body };
  let nextUrl = url;
  const q = url.indexOf("?");
  if (q !== -1) {
    const params = new URLSearchParams(url.slice(q + 1));
    const mapped = new URLSearchParams();
    for (const [k, v] of params) mapped.append(k, toEnglish.get(v) ?? v);
    nextUrl = `${url.slice(0, q)}?${mapped}`;
  }
  let nextBody = body;
  if (typeof body === "string" && /^\s*[[{]/.test(body)) {
    try {
      nextBody = JSON.stringify(mapStrings(JSON.parse(body), toEnglish));
    } catch {
      /* not JSON: leave it */
    }
  } else if (body && typeof body === "object" && isPlain(body)) {
    nextBody = mapStrings(body, toEnglish);
  }
  return { url: nextUrl, body: nextBody };
}
