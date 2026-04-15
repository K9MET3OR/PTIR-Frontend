import { api } from "./api";

export const motoristaService = {
  list: async () => {
    const response = await api.get("/motoristas/");
    return response.motoristas || [];
  },
  get: async (id) => {
    const response = await api.get(`/motoristas/${id}/`);
    return response.motorista || response;
  },
  create: (data)     => api.post("/motoristas/registo-motorista", data),
  update: (id, data) => api.put(`/motoristas/${id}/`, data),
  remove: (id)       => api.delete(`/motoristas/${id}/`),
};