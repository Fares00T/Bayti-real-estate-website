import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "./api";

const AuthContext = createContext(null);

// The session lives in an httpOnly cookie; on load we ask the API who we are
// instead of trusting anything stored in the browser.
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setAdmin(res.data))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));

    const signedOut = () => setAdmin(null);
    window.addEventListener("admin:signed-out", signedOut);
    return () => window.removeEventListener("admin:signed-out", signedOut);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setAdmin(res.data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAdmin(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ admin, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAdmin = () => useContext(AuthContext);
