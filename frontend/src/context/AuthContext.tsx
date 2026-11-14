import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "../lib/api";
import type { User } from "../lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; name: string; role: "CLIENT" | "PROVIDER" }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// There's no "/auth/me" endpoint yet, so we trust the JWT's embedded claims to
// restore a session rather than round-tripping on load. Good enough for the MVP;
// a real deploy would want a /me check to catch revoked/expired tokens early.
function decodeUserFromToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { id: payload.id, email: payload.email, role: payload.role, name: payload.name ?? payload.email };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) setUser(decodeUserFromToken(token));
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const data = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload: { email: string; password: string; name: string; role: "CLIENT" | "PROVIDER" }) {
    const data = await api<{ token: string; user: User }>("/auth/register", { method: "POST", body: payload });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
