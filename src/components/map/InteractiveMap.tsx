"use client";

import React, { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMode } from '@/contexts/ModeContext';
import { createCoffeeMarker, createMatchaMarker, createRoasteryMarker } from './MapIcons';
import { Roastery } from '@/types/roastery';
import { MatchaPlace } from '@/data/matcha';

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

// Type guard to check if place is a Roastery
const isRoastery = (place: Roastery | MatchaPlace): place is Roastery => {
  return 'brewMethods' in place;
};

// Check if roastery is a roastery (has specific roastery identifier)
const isRoasteryPlace = (place: Roastery): boolean => {
  // You can customize this logic based on your roastery identification
  // For now, checking if it's the specific roastery mentioned
  return place.id === 'canopy-jerusalem' || place.name.includes('רוסטרי');
};

const InteractiveMap: React.FC = () => {
  const { mode, data } = useMode();

  // Filter places with valid coordinates
  const placesWithCoords = useMemo(() => {
    return data.filter(place => {
      if (isRoastery(place)) {
        return place.latitude != null && place.longitude != null;
      } else {
        return place.latitude != null && place.longitude != null;
      }
    });
  }, [data]);

  // Calculate bounds for all places
  const bounds = useMemo(() => {
    if (placesWithCoords.length === 0) {
      // Default to Israel center
      return [[31.5, 34.5], [32.5, 35.5]] as L.LatLngBoundsExpression;
    }

    const lats = placesWithCoords.map(p => 
      isRoastery(p) ? p.latitude! : p.latitude
    );
    const lngs = placesWithCoords.map(p => 
      isRoastery(p) ? p.longitude! : p.longitude
    );

    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ] as L.LatLngBoundsExpression;
  }, [placesWithCoords]);

  // Get appropriate marker based on mode and place type
  const getMarkerIcon = (place: Roastery | MatchaPlace): L.Icon => {
    if (mode === 'coffee') {
      if (isRoastery(place) && isRoasteryPlace(place)) {
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
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
        <MapBoundsUpdater bounds={bounds} />
        {placesWithCoords.map((place) => {
          const lat = isRoastery(place) ? place.latitude! : place.latitude;
          const lng = isRoastery(place) ? place.longitude! : place.longitude;
          
          return (
            <Marker
              key={place.id}
              position={[lat, lng]}
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

