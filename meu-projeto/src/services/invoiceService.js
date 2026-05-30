import { api } from "./api";

export const invoiceService = {
  register:    (body)      => api.post("/invoice/register/", body),
  listByDriver:(driver_id) => api.get(`/invoice/driver/${driver_id}/`),
};