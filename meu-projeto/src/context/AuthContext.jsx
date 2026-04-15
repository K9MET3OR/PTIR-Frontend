import { createContext, useContext, useEffect, useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase";
import { api } from "../services/api";

export const AuthContext = createContext(null);

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
      console.log("[AUTH] Tentando login com:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("[AUTH] Firebase login bem-sucedido");
      
      const firebaseToken = await userCredential.user.getIdToken();
      console.log("[AUTH] Token obtido do Firebase");

      const data = await api.post(`/user/login/`, { selectedRole });
      console.log("[AUTH] Login no backend bem-sucedido");

      setUser(data.user); setRole(data.user.role); setToken(firebaseToken);
      localStorage.setItem("taxigest_token", firebaseToken);
      localStorage.setItem("taxigest_user", JSON.stringify(data.user));
      return data;
    } catch (err) {
      console.error("[AUTH] Erro:", err);
      throw err;
    }
  }

  async function signup(email, password, username, name, selectedRole) {
    try {
      console.log("[AUTH] Iniciando signup para:", email);
      
      // 1. Criar utilizador no Firebase.
      // Se já existir no Firebase (ex.: tentativa anterior falhou no backend),
      // tentamos autenticar com o mesmo email/password para continuar o registo no Django.
      let userCredential;
      try {
        console.log("[AUTH] Criando user no Firebase...");
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("[AUTH] User criado no Firebase");
      } catch (firebaseErr) {
        console.log("[AUTH] Firebase error:", firebaseErr.code, firebaseErr.message);
        if (firebaseErr?.code === "auth/email-already-in-use") {
          console.log("[AUTH] Email já existe no Firebase, tentando login...");
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log("[AUTH] Login no Firebase bem-sucedido");
        } else {
          throw firebaseErr;
        }
      }

      console.log("[AUTH] Obtendo token do Firebase...");
      const firebaseToken = await userCredential.user.getIdToken();
      console.log("[AUTH] Token obtido");

      // 2. Criar utilizador no Django
      console.log("[AUTH] Criando user no Django backend...");
      const data = await api.post(`/user/`, {
        username,
        name,
        role: selectedRole,
        email
      });
      console.log("[AUTH] User criado no Django");

      // 3. Setar o utilizador no contexto
      setUser(data.user); setRole(data.user.role); setToken(firebaseToken);
      localStorage.setItem("taxigest_token", firebaseToken);
      localStorage.setItem("taxigest_user", JSON.stringify(data.user));
      
      // Redirecionar para o dashboard correto (admin -> /gestor)
      const routePath = selectedRole === 'admin' ? '/gestor' : `/${selectedRole}`;
      return { ...data, routePath };
    } catch (err) {
      console.error("[AUTH] Erro no signup:", err);
      throw err;
    }
  }

  const logout = () => {
    setUser(null); setRole(null); setToken(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, role, token, loading, login, signup, logout }}>
      {loading ? <div>A carregar...</div> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);