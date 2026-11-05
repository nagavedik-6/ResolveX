import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    try {
      if (localStorage.getItem("resolvex_token")) await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("resolvex_token");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("resolvex_token")) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem("resolvex_token"))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    localStorage.setItem("resolvex_token", data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const { data } = await api.post("/auth/register", details);
    localStorage.setItem("resolvex_token", data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const updateUser = useCallback((updated) => setUser(updated), []);
  const value = useMemo(() => ({ user, loading, signIn, register, signOut, updateUser }), [user, loading, signIn, register, signOut, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
