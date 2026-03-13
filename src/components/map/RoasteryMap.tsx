'use client';

import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import type { Roastery } from "@/types/roastery";
import "leaflet/dist/leaflet.css";

const defaultCenter: [number, number] = [32.0809, 34.7806];

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type RoasteryMapProps = {
  roasteries: Roastery[];
};

export function RoasteryMap({ roasteries }: RoasteryMapProps) {
  const roasteriesWithCoords = useMemo(
    () => roasteries.filter((r) => typeof r.latitude === "number" && typeof r.longitude === "number"),
    [roasteries],
  );

  if (typeof window === "undefined") {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white/70 shadow-soft">
      {roasteriesWithCoords.length === 0 ? (
        <div className="flex h-80 flex-col items-center justify-center gap-2 p-6 text-center text-coffee-ink/70">
          <span className="text-4xl">🗺️</span>
          <p className="text-sm">
            ברגע שנוסיף קואורדינטות לכל רוסטריה, המפה תתעדכן בנקודות אינטראקטיביות.
          </p>
        </div>
      ) : (
        <MapContainer center={defaultCenter} zoom={12} maxZoom={19} className="h-96 w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            keepBuffer={8}
            updateWhenZooming={false}
          />
          {roasteriesWithCoords.map((roastery) => (
            <Marker
              key={roastery.id}
              position={[roastery.latitude!, roastery.longitude!]}
              icon={markerIcon}
            >
              <Popup>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3 min-w-[200px] space-y-1">
                  <strong className="text-slate-900 dark:text-slate-100">{roastery.name}</strong>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{roastery.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
