import { api } from "./api";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

/**
 * Converte uma morada em coordenadas [lon, lat]
 * Usa o backend para evitar problemas de CORS e rate limit direto no frontend.
 */
export async function geocodificar(morada) {
  if (!morada || morada.trim().length < 3) return [];

  try {
    const data = await api.get(`/geocoding/search?q=${encodeURIComponent(morada)}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro na geocodificação:", error);
    return [];
  }
}

/**
 * Converte coordenadas em morada (geocodificação inversa)
 * Mantido com chamada direta por agora.
 */
export async function geocodificarInverso(lon, lat) {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat),
    format: "json",
  });

  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "Accept-Language": "pt-PT" },
  });

  if (!res.ok) throw new Error("Erro na geocodificação inversa");

  const data = await res.json();
  return data.display_name ?? null;
}

/**
 * Calcula rota entre origem e destino
 */
export async function calcularRota(origem, destino) {
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    alternatives: "false",
    steps: "false",
  });

  const res = await fetch(
    `${OSRM_BASE}/${origem.lon},${origem.lat};${destino.lon},${destino.lat}?${params}`
  );

  if (!res.ok) throw new Error("Erro ao calcular rota");

  const data = await res.json();
  if (!data.routes?.length) return null;

  return data.routes[0].geometry.coordinates;
}