import { useEffect, useRef } from "react";
import L, { Map as LeafletMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";

type Pt = { id: number; lat: number; lon: number; type: "sms" | "url" | "voip" };

export default function Map({ points }: { points: Pt[] }) {
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  // Create map once
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;

    const map = L.map(divRef.current, {
      center: [22.7196, 75.8577], // Indore
      zoom: 12,
      zoomControl: true,
      preferCanvas: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);

    // If the container resizes (e.g., panel opens), fix tile alignment
    if (divRef.current) {
      const ro = new ResizeObserver(() => {
        // small delay helps when parent grid changes
        setTimeout(() => map.invalidateSize(), 0);
      });
      ro.observe(divRef.current);
      resizeObsRef.current = ro;
    }

    mapRef.current = map;
    layerRef.current = layer;

    return () => {
      try {
        resizeObsRef.current?.disconnect();
      } catch {}
      map.remove(); // full cleanup
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Render/update circles when points change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds = L.latLngBounds([]);

    points.forEach(p => {
      const lat = Number(p.lat);
      const lon = Number(p.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return; // ignore junk

      const color =
        p.type === "sms" ? "#e07b3a" : p.type === "url" ? "#6b46c1" : "#d32f2f";

      const circle = L.circleMarker([lat, lon], {
        radius: 8,
        color,
        weight: 2,
        fillOpacity: 0.25
      })
        .addTo(layer)
        .bindPopup(`${p.type.toUpperCase()} #${p.id}`);

      bounds.extend(circle.getLatLng());
    });

    // Fit to data when we have it; otherwise stick to default center/zoom
    if (points.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
    } else {
      map.setView([22.7196, 75.8577], 12);
    }

    // Ensure the map tiles/layout catch up if this ran after a layout change
    setTimeout(() => map.invalidateSize(), 0);
  }, [points]);

  // Make sure the container actually has height in the parent
  return <div ref={divRef} className="h-full w-full" />;
}
