import { auth } from "./firebase";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// Faz fetch ao Django com o token Firebase no header Authorization
async function apiFetch(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? "Erro na API");
  }

  // 204 No Content não tem body
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: "PUT",    body: JSON.stringify(body) }),
  patch:  (path, body)   => apiFetch(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: "DELETE" }),
};