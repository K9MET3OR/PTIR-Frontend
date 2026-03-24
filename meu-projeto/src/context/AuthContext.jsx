import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("taxigest_token");
    const savedUser = localStorage.getItem("taxigest_user");
    if (savedToken && savedUser) {
      const u = JSON.parse(savedUser);
      setToken(savedToken); setUser(u); setRole(u.role);
    }
    setLoading(false);
  }, []);

  async function login(email, password, selectedRole) {
    const res = await fetch("http://localhost:8000/api/user/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    if (data.user.role !== selectedRole) 
      throw new Error(`Conta sem permissão de ${selectedRole}`);

    setUser(data.user); setRole(data.user.role); setToken(data.token);
    localStorage.setItem("hermez_token", data.token);
    localStorage.setItem("hermez_user", JSON.stringify(data.user));
    return data;
  }

  const logout = () => {
    setUser(null); setRole(null); setToken(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, role, token, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);