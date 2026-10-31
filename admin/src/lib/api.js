import axios from "axios";

// Every call goes to the admin API, which is guarded server-side by its own
// session cookie (scoped to /api/admin) — the marketplace login never works here.
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/admin`,
  withCredentials: true,
});

// A 401 anywhere means the admin session ended; the auth provider listens
// for this and sends the person back to the sign-in screen.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.startsWith("/auth/login")) {
      window.dispatchEvent(new Event("admin:signed-out"));
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (err, fallback = "Something went wrong.") =>
  err?.response?.data?.message || fallback;

// Lets the sidebar refresh its counters after a review decision
export const notifyDataChanged = () =>
  window.dispatchEvent(new Event("admin:data-changed"));

export const MARKETPLACE_URL = import.meta.env.VITE_MARKETPLACE_URL || "";

export default api;
