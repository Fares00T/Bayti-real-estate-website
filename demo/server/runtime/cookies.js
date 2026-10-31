// Cookie jar for the in-browser API. Like real cookies, each one has a path,
// so the marketplace, agency and admin sessions stay separate.
import { store } from "./storage.js";

const KEY = "bayti_demo_cookies";

const load = () => {
  try {
    return JSON.parse(store.get(KEY)) || {};
  } catch {
    return {};
  }
};

const save = (jar) => store.set(KEY, JSON.stringify(jar));

export function cookiesFor(path) {
  const jar = load();
  const now = Date.now();
  const out = {};
  for (const [name, c] of Object.entries(jar)) {
    if (c.expires && c.expires < now) continue;
    if (path === c.path || path.startsWith(c.path.endsWith("/") ? c.path : `${c.path}/`) || c.path === "/") {
      out[name] = c.value;
    }
  }
  return out;
}

export function setCookie(name, value, options = {}) {
  const jar = load();
  jar[name] = {
    value: String(value),
    path: options.path || "/",
    expires: options.maxAge ? Date.now() + options.maxAge : options.expires ? new Date(options.expires).getTime() : null,
  };
  save(jar);
}

export function clearCookie(name) {
  const jar = load();
  delete jar[name];
  save(jar);
}

export function clearAllCookies() {
  store.remove(KEY);
}

// Used by the demo role switcher
export function hasCookie(name) {
  return Boolean(cookiesFor("/api/agency/x")[name] || cookiesFor("/api/admin/x")[name] || cookiesFor("/api/x")[name]);
}
