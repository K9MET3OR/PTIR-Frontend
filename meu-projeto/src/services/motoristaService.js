import { api } from "./api";

export const motoristaService = {
  list: async () => {
    const response = await api.get("/driver/");
    return response.motoristas || [];
  },

  get: async (id) => {
    const response = await api.get(`/driver/${id}`);
    return response.motorista || response;
  },

  create: (data) => api.post("/driver/register", data),
  update: (id, data) => api.put(`/driver/${id}`, data),
  remove: (id) => api.delete(`/driver/${id}`),
};