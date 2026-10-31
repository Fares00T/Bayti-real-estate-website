import axios, { AxiosError } from "axios";
import { createAxiosAdapter } from "../../../server/runtime/client.js";

// Every call goes to the agency API, guarded server-side by its own session
// cookie (scoped to /api/agency): marketplace and admin sessions never work here.
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/agency`,
  withCredentials: true,
  // Demo build: answered by the API running in the browser
  adapter: createAxiosAdapter(AxiosError),
});

// A 401 anywhere means the session ended (signed out, removed from the
// agency, access switched off); the auth provider sends the person to sign-in.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.startsWith("/auth/login")) {
      window.dispatchEvent(new CustomEvent("agency:signed-out", { detail: err.response.data?.message }));
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (err, fallback = "Something went wrong.") =>
  err?.response?.data?.message || fallback;

// Lets the sidebar refresh its counters after a change
export const notifyDataChanged = () => window.dispatchEvent(new Event("agency:data-changed"));

// Demo build: the marketplace is served from the same origin
export const MARKETPLACE_URL = import.meta.env.VITE_MARKETPLACE_URL || window.location.origin;

// Notification links point at whichever app they belong to
export const linkTarget = (link) => {
  if (!link) return null;
  try {
    const url = new URL(link, window.location.origin);
    const base = import.meta.env.BASE_URL.slice(0, -1);
    if (url.origin === window.location.origin && url.pathname.startsWith(base + "/")) {
      return { to: url.pathname.slice(base.length) + url.search };
    }
    return { href: url.href };
  } catch {
    return null;
  }
};

export default api;
