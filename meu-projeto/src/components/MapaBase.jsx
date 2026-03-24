import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Style, Circle, Fill, Stroke, Text } from "ol/style";
import "ol/ol.css";

// Centros de Lisboa em [lon, lat]
const LISBOA_CENTER = [-9.1393, 38.7223];
const DEFAULT_ZOOM  = 13;

/**
 * MapaBase — componente reutilizável OpenLayers
 *
 * Props:
 *   markers: [{ id, lon, lat, label, color }]
 *   height:  string CSS (default "100%")
 *   zoom:    number (default 13)
 *   center:  [lon, lat] (default Lisboa)
 *   onMarkerClick: (marker) => void
 */
export default function MapaBase({
  markers = [],
  height = "100%",
  zoom = DEFAULT_ZOOM,
  center = LISBOA_CENTER,
  onMarkerClick,
}) {
  const mapRef    = useRef(null);
  const mapObj    = useRef(null);
  const vectorRef = useRef(null);

  // Inicializa o mapa uma vez
  useEffect(() => {
    if (mapObj.current) return;

    const vectorSource = new VectorSource();
    vectorRef.current  = vectorSource;

    const vectorLayer = new VectorLayer({ source: vectorSource });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat(center),
        zoom,
      }),
    });

    // Click nos marcadores
    if (onMarkerClick) {
      map.on("click", (e) => {
        map.forEachFeatureAtPixel(e.pixel, (feature) => {
          const data = feature.get("markerData");
          if (data) onMarkerClick(data);
        });
      });

      // Cursor pointer quando passa em cima
      map.on("pointermove", (e) => {
        const hit = map.hasFeatureAtPixel(e.pixel);
        map.getTargetElement().style.cursor = hit ? "pointer" : "";
      });
    }

    mapObj.current = map;

    return () => {
      map.setTarget(undefined);
      mapObj.current = null;
    };
  }, []);

  // Atualiza marcadores quando mudam
  useEffect(() => {
    if (!vectorRef.current) return;

    vectorRef.current.clear();

    markers.forEach((m) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([m.lon, m.lat])),
      });

      feature.set("markerData", m);

      feature.setStyle(
        new Style({
          image: new Circle({
            radius: 10,
            fill:   new Fill({ color: m.color ?? "#0f172a" }),
            stroke: new Stroke({ color: "#fff", width: 2 }),
          }),
          text: new Text({
            text:         m.label ?? "",
            offsetY:      -20,
            font:         "bold 12px sans-serif",
            fill:         new Fill({ color: "#0f172a" }),
            stroke:       new Stroke({ color: "#fff", width: 3 }),
          }),
        })
      );

      vectorRef.current.addFeature(feature);
    });
  }, [markers]);

  // Atualiza centro/zoom quando mudam
  useEffect(() => {
    if (!mapObj.current) return;
    mapObj.current.getView().animate({
      center:   fromLonLat(center),
      zoom,
      duration: 400,
    });
  }, [center, zoom]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height, borderRadius: 10, overflow: "hidden" }}
    />
  );
}