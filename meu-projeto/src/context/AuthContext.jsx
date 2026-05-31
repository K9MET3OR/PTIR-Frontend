import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../services/firebase";
import { api } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem("taxigest_token");
      const savedUser = localStorage.getItem("taxigest_user");

      if (savedToken && savedUser) {
        const u = JSON.parse(savedUser);
        console.log("[AUTH] Carregando dados do localStorage:", u);
        setToken(savedToken);
        setUser(u);
        setRole(u.role);
      } else {
        console.log("[AUTH] Nenhum dado de autenticação no localStorage");
      }
    } catch (err) {
      console.error("[AUTH] Erro ao carregar dados do localStorage:", err);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  async function login(email, password, selectedRole) {
    try {
      console.log("[AUTH] Tentando login com:", email);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("[AUTH] Firebase login bem-sucedido");

      const firebaseToken = await userCredential.user.getIdToken();
      console.log("[AUTH] Token obtido do Firebase");

      const data = await api.post(`/user/login`, { selectedRole });
      console.log("[AUTH] Login no backend bem-sucedido");

      setUser(data.user);
      setRole(data.user.role);
      setToken(firebaseToken);

      localStorage.setItem("taxigest_token", firebaseToken);
      localStorage.setItem("taxigest_user", JSON.stringify(data.user));

      return data;
    } catch (err) {
      console.error("[AUTH] Erro:", err);
      throw err;
    }
  }

  async function signup(signupData) {
    try {
      const { email, password, username, name, selectedRole, ...extraFields } = signupData;

      console.log("[AUTH] Iniciando signup para:", email);

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

      let data;

      if (selectedRole === "motorista") {
        console.log("[AUTH] Criando motorista no backend...");
        data = await api.post(`/driver/register`, {
          username,
          nome: name,
          email,
          nif: extraFields.nif,
          genero: extraFields.genero,
          n_carta: extraFields.n_carta,
          data_nascimento: extraFields.data_nascimento,
          codigo_postal: extraFields.codigo_postal,
          telefone: extraFields.telefone,
        });
        console.log("[AUTH] Motorista criado no backend");
      } else if (selectedRole === "cliente") {
        console.log("[AUTH] Criando cliente no backend...");
        data = await api.post(`/client/register`, {
          username,
          email,
          password,
          name,
          nif: extraFields.nif,
          genero: extraFields.genero,
        });
        console.log("[AUTH] Cliente criado no backend");
      } else {
        console.log("[AUTH] Criando user no Django backend...");
        data = await api.post(`/user/`, {
          username,
          name,
          role: selectedRole,
          email,
        });
        console.log("[AUTH] User criado no Django");
      }

      let userData;

      if (selectedRole === "motorista" && data.motorista) {
        userData = {
          id: data.motorista.id,
          username: data.motorista.username,
          name: data.motorista.nome,
          role: "motorista",
        };
      } else if (selectedRole === "cliente" && data.user) {
        userData = {
          id: data.user.id,
          username: data.user.username,
          name: data.user.name,
          role: "cliente",
          nif: data.user.nif,
        };
      } else if (data.user) {
        userData = data.user;
      } else {
        userData = data;
      }

      setUser(userData);
      setRole(userData.role);
      setToken(firebaseToken);

      localStorage.setItem("taxigest_token", firebaseToken);
      localStorage.setItem("taxigest_user", JSON.stringify(userData));

      return { user: userData, success: true };
    } catch (err) {
      console.error("[AUTH] Erro no signup:", err);
      throw err;
    }
  }

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("[AUTH] Erro ao fazer logout do Firebase:", err);
    }

    setUser(null);
    setRole(null);
    setToken(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, role, token, loading, login, signup, logout }}>
      {loading ? <div>A carregar...</div> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);