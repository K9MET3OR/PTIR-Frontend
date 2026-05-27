import { api } from "./api";

export const refuelService = {
  register: async (data) => {
    const response = await api.post("/refuel/register", data);
    return response;
  },
  listByTaxi: async (taxiId) => {
    const response = await api.get(`/refuel/taxi/${taxiId}`);
    return response;
  },
};
