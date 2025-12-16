"use client";

import React, { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMode } from '@/contexts/ModeContext';
import { usePlaceData } from '@/hooks/usePlaceData';
import { createCoffeeMarker, createMatchaMarker, createRoasteryMarker } from './MapIcons';
import type { Place } from '@/types/place';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Component to handle map bounds updates
const MapBoundsUpdater: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, bounds]);

  return null;
};


const InteractiveMap: React.FC = () => {
  const { appMode } = useMode();
  const { places } = usePlaceData(appMode);

  // Filter places with valid coordinates
  const placesWithCoords = useMemo(() => {
    return places.filter((place: Place) => {
      return place.latitude != null && place.longitude != null;
    });
  }, [places]);

  // Calculate bounds for all places
  const bounds = useMemo(() => {
    if (placesWithCoords.length === 0) {
      // Default to Israel center
      return [[31.5, 34.5], [32.5, 35.5]] as L.LatLngBoundsExpression;
    }

    const lats = placesWithCoords.map(p => p.latitude!);
    const lngs = placesWithCoords.map(p => p.longitude!);

    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ] as L.LatLngBoundsExpression;
  }, [placesWithCoords]);

  // Get appropriate marker based on mode and place type
  const getMarkerIcon = (place: Place): L.DivIcon => {
    if (appMode === 'coffee') {
      // Check if it's a roastery (has brewMethods and specific ID)
      if ('brewMethods' in place && (place.id === 'canopy-jerusalem' || place.name.includes('רוסטרי'))) {
        return createRoasteryMarker();
      }
      return createCoffeeMarker();
    } else {
      return createMatchaMarker();
    }
  };

  if (typeof window === 'undefined') {
    return <div className="w-full h-full bg-slate-100 animate-pulse rounded-lg" />;
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200">
      <MapContainer
        center={[31.8, 35.0]}
        zoom={8}
        maxZoom={30}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={30}
          keepBuffer={8}
          updateWhenZooming={false}
        />
        <MapBoundsUpdater bounds={bounds} />
        {placesWithCoords.map((place) => {
          return (
            <Marker
              key={place.id}
              position={[place.latitude!, place.longitude!]}
              icon={getMarkerIcon(place)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-sm mb-1">{place.name}</h3>
                  <p className="text-xs text-slate-600">{place.city || 'לא צוין'}</p>
                  {place.address && (
                    <p className="text-xs text-slate-500 mt-1">{place.address}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

// Export as dynamic component to disable SSR
export default dynamic(() => Promise.resolve(InteractiveMap), {
  ssr: false,
});

