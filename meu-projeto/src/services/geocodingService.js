// Geocodificação com Nominatim (OpenStreetMap) — sem chave de API
// Conforme definido no relatório (secção 1.3)

const BASE = "https://nominatim.openstreetmap.org";

/**
 * Converte uma morada em coordenadas [lon, lat]
 * Retorna null se não encontrar
 */
export async function geocodificar(morada) {
  const params = new URLSearchParams({
    q:              morada + ", Portugal",
    format:         "json",
    limit:          "5",
    countrycodes:   "pt",
  });

  const res = await fetch(`${BASE}/search?${params}`, {
    headers: { "Accept-Language": "pt-PT" },
  });

  if (!res.ok) throw new Error("Erro na geocodificação");

  const data = await res.json();
  if (!data.length) return null;

  return data.map((r) => ({
    label: r.display_name,
    lon:   parseFloat(r.lon),
    lat:   parseFloat(r.lat),
  }));
}

/**
 * Converte coordenadas em morada (geocodificação inversa)
 */
export async function geocodificarInverso(lon, lat) {
  const params = new URLSearchParams({
    lon:    lon,
    lat:    lat,
    format: "json",
  });

  const res = await fetch(`${BASE}/reverse?${params}`, {
    headers: { "Accept-Language": "pt-PT" },
  });

  if (!res.ok) throw new Error("Erro na geocodificação inversa");

  const data = await res.json();
  return data.display_name ?? null;
}