import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "./api";

const AuthContext = createContext(null);

// The session lives in an httpOnly cookie; on load we ask the API who we are
// instead of trusting anything stored in the browser. `can` mirrors the
// server's permission list so the UI only offers what will be accepted.
export function AuthProvider({ children }) {
  const [member, setMember] = useState(null);
  const [checking, setChecking] = useState(true);
  const [endedReason, setEndedReason] = useState("");

  const refresh = useCallback(
    () =>
      api
        .get("/auth/me")
        .then((res) => setMember(res.data))
        .catch(() => setMember(null)),
    []
  );

  useEffect(() => {
    refresh().finally(() => setChecking(false));
    const signedOut = (e) => {
      setMember((m) => {
        if (m && e.detail) setEndedReason(e.detail);
        return null;
      });
    };
    window.addEventListener("agency:signed-out", signedOut);
    return () => window.removeEventListener("agency:signed-out", signedOut);
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setEndedReason("");
    setMember(res.data);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setMember(null);
    }
  }, []);

  const can = useCallback((permission) => Boolean(member?.permissions?.includes(permission)), [member]);

  return (
    <AuthContext.Provider value={{ member, setMember, checking, login, logout, refresh, can, endedReason }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useMember = () => useContext(AuthContext);
