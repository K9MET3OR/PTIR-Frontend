import { api } from "./api";

export const taxiService = {
  list:     ()         => api.get("/taxis/"),
  get:      (id)       => api.get(`/taxis/${id}/`),
  create:   (data)     => api.post("/taxis/registo-taxi", data),
  update:   (id, data) => api.put(`/taxis/${id}/`, data),
  remove:   (id)       => api.delete(`/taxis/${id}/`),
};