import { auth } from "./firebase";

const RAW_API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const BASE_URL = RAW_API_URL.endsWith("/api")
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/+$/, "")}/api`;

async function apiFetch(path, options = {}) {
  // 1. Pede o token atual ao Firebase
  const firebaseUser = auth.currentUser;
  const token = firebaseUser ? await firebaseUser.getIdToken() : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // 2. Envia o token no header para o Django validar
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Erro na API");
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put:    (path, body) => apiFetch(path, { method: "PUT",  body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: "DELETE" }),
};