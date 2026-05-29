import { api } from "./api";

export const invoiceService = {
  register:    (body)      => api.post("/invoices/register/", body),
  listByDriver:(driver_id) => api.get(`/invoices/driver/${driver_id}/`),
};