import axios from "axios";

// Every call goes to the agency API, guarded server-side by its own session
// cookie (scoped to /api/agency): marketplace and admin sessions never work here.
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/agency`,
  withCredentials: true,
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

export const MARKETPLACE_URL = import.meta.env.VITE_MARKETPLACE_URL || "";

// Notification links point at whichever app they belong to
export const linkTarget = (link) => {
  if (!link) return null;
  try {
    const url = new URL(link, window.location.origin);
    if (url.origin === window.location.origin) return { to: url.pathname + url.search };
    return { href: url.href };
  } catch {
    return null;
  }
};

export default api;
