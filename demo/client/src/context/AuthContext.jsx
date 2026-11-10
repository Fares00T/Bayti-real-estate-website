import { createContext, useCallback, useEffect, useState } from "react";
import apiRequest from "../components/lib/apiRequest";

export const AuthContext = createContext();

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
};

// Persist synchronously so a navigation/reload right after login can't lose it
const storeUser = (user) => {
  try {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  } catch {
    // storage unavailable (private mode); the session still works in memory
  }
};

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(readStoredUser);

  const updateUser = useCallback((data) => {
    storeUser(data);
    setCurrentUser(data);
  }, []);

  // The stored copy can be stale (an admin approved the agency, changed the
  // role...): refresh it from the server once per page load
  useEffect(() => {
    if (!readStoredUser()) return;
    apiRequest
      .get("/auth/me")
      .then((res) => updateUser(res.data))
      .catch(() => {});
  }, [updateUser]);

  // If the session cookie is missing or expired, drop the stale local user
  useEffect(() => {
    const id = apiRequest.interceptors.response.use(
      (res) => res,
      (err) => {
        const status = err.response?.status;
        const message = err.response?.data?.message;
        if (
          status === 401 ||
          (status === 403 && message === "Token is not Valid!")
        ) {
          updateUser(null);
        }
        return Promise.reject(err);
      }
    );
    return () => apiRequest.interceptors.response.eject(id);
  }, [updateUser]);

  return (
    <AuthContext.Provider value={{ currentUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
