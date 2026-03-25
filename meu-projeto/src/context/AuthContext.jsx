import { createContext, useContext, useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";

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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseToken = await userCredential.user.getIdToken();

      const res = await fetch("/api/user/login/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${firebaseToken}`
        },
        body: JSON.stringify({ selectedRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUser(data.user); setRole(data.user.role); setToken(firebaseToken);
      localStorage.setItem("taxigest_token", firebaseToken);
      localStorage.setItem("taxigest_user", JSON.stringify(data.user));
      return data;
    } catch (err) {
      throw err;
    }
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