import { api } from "./api";

export const taxiService = {
  list: async () => {
    const response = await api.get("/taxi/");
    // Transforma a resposta para { data: [...] }
    // Backend retorna { success: true, taxis: [...], total: N }
    return { data: response.taxis || response.data || [] };
  },
  get:      (id)       => api.get(`/taxi/${id}/`),
  create:   (data)     => api.post("/taxi/registo-taxi", data),
  update:   (id, data) => api.put(`/taxi/${id}/`, data),
  remove:   (id)       => api.delete(`/taxi/${id}/apagar`),
};