"use client";

import { useEffect, useRef } from "react";

type Etape = {
  numero: number;
  titre: string;
  lat: number;
  lng: number;
};

interface Props {
  origin: { lat: number; lng: number };
  etapes: Etape[];
  activeEtape: number;
  userPosition: { lat: number; lng: number } | null;
  onSelectEtape: (i: number) => void;
}

export default function BaladeMap({
  origin,
  etapes,
  activeEtape,
  userPosition,
  onSelectEtape,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accuracyCircleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toNextLineRef = useRef<any>(null);

  const etapeCoords = etapes.map((e) => ({ lat: e.lat, lng: e.lng }));

  const makeStepIcon = (L: typeof import("leaflet"), num: number, active: boolean) => {
    const bg = active ? "#c4965a" : "#1c1916";
    const border = active ? "#e8b86d" : "#3d3830";
    const textColor = active ? "#0a0906" : "#8a8070";
    const size = active ? 36 : 28;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 6}" viewBox="0 0 36 42">
        <path d="M18 0C8.059 0 0 8.059 0 18c0 11.314 18 24 18 24S36 29.314 36 18C36 8.059 27.941 0 18 0z"
          fill="${bg}" stroke="${border}" stroke-width="1.5"/>
        <text x="18" y="21" text-anchor="middle" dominant-baseline="middle"
          font-family="sans-serif" font-size="${active ? 13 : 11}" font-weight="700"
          fill="${textColor}">${num}</text>
      </svg>`;
    return L.divIcon({
      html: svg,
      iconSize: [size, size + 6],
      iconAnchor: [size / 2, size + 6],
      popupAnchor: [0, -(size + 6)],
      className: "",
    });
  };

  const makeUserIcon = (L: typeof import("leaflet")) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="10" fill="rgba(100,160,255,0.2)" stroke="rgba(100,160,255,0.5)" stroke-width="1"/>
        <circle cx="11" cy="11" r="5" fill="#4a9eff" stroke="#fff" stroke-width="2"/>
      </svg>`;
    return L.divIcon({
      html: svg,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      className: "",
    });
  };

  // Initial map setup
  useEffect(() => {
    if (!containerRef.current || etapeCoords.length === 0) return;
    let mounted = true;

    import("leaflet").then((L) => {
      if (!mounted || !containerRef.current) return;

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
        userMarkerRef.current = null;
      }

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        attributionControl: false,
      });
      mapRef.current = map;

      // Zoom control bottom-right
      map.zoomControl.setPosition("bottomright");

      // Dark tiles
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      L.control
        .attribution({ position: "bottomleft", prefix: "" })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>')
        .addTo(map);

      // Route polyline
      const latlngs = etapeCoords.map((c) => [c.lat, c.lng] as [number, number]);
      L.polyline(latlngs, {
        color: "#8b6b3d",
        weight: 2,
        dashArray: "6 4",
        opacity: 0.6,
      }).addTo(map);

      // Step markers
      markersRef.current = etapeCoords.map((coord, i) => {
        const marker = L.marker([coord.lat, coord.lng], {
          icon: makeStepIcon(L, etapes[i].numero, i === activeEtape),
          zIndexOffset: i === activeEtape ? 1000 : 0,
        }).addTo(map);
        marker.bindTooltip(etapes[i].titre, {
          direction: "top",
          offset: [0, -30],
          className: "strata-tooltip",
        });
        marker.on("click", () => onSelectEtape(i));
        return marker;
      });

      // Fit to route bounds
      const allPoints: [number, number][] = [
        [origin.lat, origin.lng],
        ...etapeCoords.map((c) => [c.lat, c.lng] as [number, number]),
      ];
      map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
    });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapes.length, origin.lat, origin.lng]);

  // Update step markers when active changes
  useEffect(() => {
    if (!mapRef.current || markersRef.current.length === 0) return;
    import("leaflet").then((L) => {
      markersRef.current.forEach((marker, i) => {
        marker.setIcon(makeStepIcon(L, etapes[i].numero, i === activeEtape));
        marker.setZIndexOffset(i === activeEtape ? 1000 : 0);
      });
      const coord = etapeCoords[activeEtape];
      if (coord) {
        mapRef.current.panTo([coord.lat, coord.lng], { animate: true, duration: 0.6 });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEtape]);

  // Update user position marker
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;
    import("leaflet").then((L) => {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
      } else {
        userMarkerRef.current = L.marker([userPosition.lat, userPosition.lng], {
          icon: makeUserIcon(L),
          zIndexOffset: 2000,
        }).addTo(mapRef.current);
      }

      // Accuracy circle
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([userPosition.lat, userPosition.lng]);
      } else {
        accuracyCircleRef.current = L.circle(
          [userPosition.lat, userPosition.lng],
          { radius: 15, color: "#4a9eff", fillColor: "#4a9eff", fillOpacity: 0.08, weight: 1, opacity: 0.3 }
        ).addTo(mapRef.current);
      }

      // Line from user to active étape
      const dest = etapeCoords[activeEtape];
      if (dest) {
        const line: [number, number][] = [
          [userPosition.lat, userPosition.lng],
          [dest.lat, dest.lng],
        ];
        if (toNextLineRef.current) {
          toNextLineRef.current.setLatLngs(line);
        } else {
          toNextLineRef.current = L.polyline(line, {
            color: "#c4965a",
            weight: 2,
            dashArray: "4 6",
            opacity: 0.7,
          }).addTo(mapRef.current);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPosition, activeEtape]);

  return (
    <>
      <style>{`
        .strata-tooltip {
          background: #1c1916;
          border: 1px solid #3d3830;
          color: #f0ebe0;
          font-family: sans-serif;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 6px;
          box-shadow: none;
          white-space: nowrap;
        }
        .strata-tooltip::before { display: none; }
        .leaflet-control-zoom {
          border: 1px solid #3d3830 !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: #1c1916 !important;
          color: #8a8070 !important;
          border-bottom: 1px solid #3d3830 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #2a2520 !important;
          color: #f0ebe0 !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ background: "var(--bg-elevated)" }}
      />
    </>
  );
}
