import { auth } from "./firebase";

// Em desenvolvimento, usa o proxy do Vite. Em produção, usa a URL completa do .env
const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const BASE_URL = rawApiUrl
  ? rawApiUrl.endsWith("/api")
    ? rawApiUrl
    : `${rawApiUrl.replace(/\/+$/, "")}/api`
  : "/api";

async function apiFetch(path, options = {}) {
  // 1. Pede o token atual ao Firebase
  const firebaseUser = auth.currentUser;
  const token = firebaseUser ? await firebaseUser.getIdToken() : null;

  const fullUrl = `${BASE_URL}${path}`;
  console.log("[API] Fetching:", fullUrl, "with token:", token ? "✓" : "✗");

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // 2. Envia o token no header para o Django validar
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  console.log("[API] Response:", fullUrl, res.status);

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
  patch:  (path, body) => apiFetch(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: "DELETE" }),
};