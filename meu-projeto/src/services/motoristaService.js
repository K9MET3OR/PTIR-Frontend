import { api } from "./api";

export const motoristaService = {
  list:   ()         => api.get("/motoristas/"),
  get:    (id)       => api.get(`/motoristas/${id}/`),
  create: (data)     => api.post("/motoristas/", data),
  update: (id, data) => api.put(`/motoristas/${id}/`, data),
  remove: (id)       => api.delete(`/motoristas/${id}/`),
};