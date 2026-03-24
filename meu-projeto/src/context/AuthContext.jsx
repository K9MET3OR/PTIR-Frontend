import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../services/firebase";

const AuthContext = createContext(null);

// Mapeamento de email → role (em produção isto vem do backend)
// O Django devolve o role no token ou num endpoint /me
const ROLE_KEY = "taxigest_role";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // Firebase user object
  const [role, setRole]       = useState(null);   // "gestor" | "motorista" | "cliente"
  const [token, setToken]     = useState(null);   // JWT para enviar ao Django
  const [loading, setLoading] = useState(true);

  // Observa mudanças de auth (refresh de página, logout, etc.)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setUser(firebaseUser);
        setToken(idToken);

        // Recupera role guardada localmente (definida no login)
        const savedRole = localStorage.getItem(ROLE_KEY);
        setRole(savedRole);
      } else {
        setUser(null);
        setToken(null);
        setRole(null);
        localStorage.removeItem(ROLE_KEY);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login: recebe email, password e role escolhida pelo utilizador
  async function login(email, password, selectedRole) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();

    // Guarda role localmente e no state
    localStorage.setItem(ROLE_KEY, selectedRole);
    setRole(selectedRole);
    setToken(idToken);

    return { user: credential.user, role: selectedRole, token: idToken };
  }

  async function logout() {
    await signOut(auth);
    localStorage.removeItem(ROLE_KEY);
  }

  // Renova o token antes de expirar (o Firebase faz isto automaticamente,
  // mas este helper garante que tens sempre o token mais recente)
  async function getToken() {
    if (!user) return null;
    return await user.getIdToken();
  }

  const value = { user, role, token, loading, login, logout, getToken };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Hook de conveniência
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}