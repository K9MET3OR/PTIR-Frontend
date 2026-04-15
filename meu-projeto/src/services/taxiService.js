import { api } from "./api";

export const taxiService = {
  list: async () => {
    const response = await api.get("/taxis/");
    // Transforma a resposta para { data: [...] }
    // Backend retorna { success: true, taxis: [...], total: N }
    return { data: response.taxis || response.data || [] };
  },
  get:      (id)       => api.get(`/taxis/${id}/`),
  create:   (data)     => api.post("/taxis/registo-taxi", data),
  update:   (id, data) => api.put(`/taxis/${id}/`, data),
  remove:   (id)       => api.delete(`/taxis/${id}/`),
};