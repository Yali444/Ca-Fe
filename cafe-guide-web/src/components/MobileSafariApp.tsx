"use client";

import React, { useState, useEffect } from "react";
import type { Place, OpeningHours } from "@/types/place";
import { SkeletonMapLoader } from "@/components/SkeletonLoader";

// Helper function to format OpeningHours object to string
function formatOpeningHours(hours: OpeningHours): string {
  const dayLabels: Record<keyof OpeningHours, string> = {
    sunday: "א'",
    monday: "ב'",
    tuesday: "ג'",
    wednesday: "ד'",
    thursday: "ה'",
    friday: "ו'",
    saturday: "שבת",
  };
  
  const parts: string[] = [];
  const dayKeys: Array<keyof OpeningHours> = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (const day of dayKeys) {
    if (hours[day]) {
      parts.push(`${dayLabels[day]}: ${hours[day]}`);
    }
  }
  
  return parts.join(", ");
}

// Simple, lightweight component for mobile Safari
// No maps, no heavy animations, no complex effects
export default function MobileSafariApp() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    // Load data with delay to prevent crashes
    const timer = setTimeout(async () => {
      try {
        const { getROASTERIES } = await import("@/data/roasteries-loader");
        const data = await getROASTERIES();
        // Transform to Place format
        const places: Place[] = data.map(r => ({
          id: `cafe-${r.id}`,
          name: r.name,
          city: r.city,
          address: r.address,
          openingHours: r.openingHours,
          description: r.description,
          brewMethods: r.brewMethods,
          vibeTags: r.vibeTags,
          instagramHandle: r.instagramHandle ?? null,
          website: r.website ?? null,
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          heroImage: r.heroImage ?? null,
          reviews: [],
        }));
        setPlaces(places);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center" dir="rtl">
        <SkeletonMapLoader />
      </div>
    );
  }

  // Group places by city
  const groupedPlaces = places.reduce((acc, place) => {
    const city = place.city || "אחר";
    if (!acc[city]) acc[city] = [];
    acc[city].push(place);
    return acc;
  }, {} as Record<string, Place[]>);

  // Sort cities by number of places
  const sortedCities = Object.entries(groupedPlaces)
    .sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="min-h-screen bg-[#F0F9FF]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-[#BAE6FD] p-4 sticky top-0 z-10">
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">☕</span>
          <h1 className="text-xl font-bold text-[#0C4A6E]">Ca Fe</h1>
        </div>
        <p className="text-center text-sm text-[#64748B] mt-1">
          {places.length} בתי קפה ספשלטי בישראל
        </p>
      </header>

      {/* Selected Place Detail */}
      {selectedPlace && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setSelectedPlace(null)}>
          <div 
            className="bg-white w-full max-h-[80vh] overflow-auto rounded-t-2xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#0C4A6E]">{selectedPlace.name}</h2>
                <p className="text-sm text-[#64748B]">{selectedPlace.city}</p>
              </div>
              <button 
                onClick={() => setSelectedPlace(null)}
                className="text-2xl text-[#64748B]"
              >
                ×
              </button>
            </div>
            
            {selectedPlace.address && (
              <p className="text-sm text-[#0C4A6E] mb-2">📍 {selectedPlace.address}</p>
            )}
            
            {selectedPlace.openingHours && (
              <p className="text-sm text-[#64748B] mb-2">
                🕐 {typeof selectedPlace.openingHours === 'string' 
                  ? selectedPlace.openingHours 
                  : formatOpeningHours(selectedPlace.openingHours)}
              </p>
            )}
            
            <p className="text-sm text-[#334155] mb-4">{selectedPlace.description}</p>
            
            {selectedPlace.brewMethods && selectedPlace.brewMethods.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedPlace.brewMethods.map(method => (
                  <span key={method} className="bg-[#E0F2FE] text-[#0C4A6E] px-2 py-1 rounded text-xs">
                    {method}
                  </span>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              {selectedPlace.instagramHandle && (
                <a 
                  href={`https://instagram.com/${selectedPlace.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#0284C7] text-white py-2 rounded text-center text-sm"
                >
                  Instagram
                </a>
              )}
              {selectedPlace.website && (
                <a 
                  href={selectedPlace.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#0284C7] text-white py-2 rounded text-center text-sm"
                >
                  אתר
                </a>
              )}
              {selectedPlace.latitude && selectedPlace.longitude && (
                <a 
                  href={`https://www.google.com/maps?q=${selectedPlace.latitude},${selectedPlace.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#0284C7] text-white py-2 rounded text-center text-sm"
                >
                  מפה
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Places List */}
      <main className="p-4">
        {sortedCities.map(([city, cityPlaces]) => (
          <div key={city} className="mb-6">
            <h2 className="text-lg font-bold text-[#0C4A6E] mb-2 flex items-center gap-2">
              <span>📍</span>
              {city}
              <span className="text-sm font-normal text-[#64748B]">({cityPlaces.length})</span>
            </h2>
            <div className="space-y-2">
              {cityPlaces.map(place => (
                <button
                  key={place.id}
                  onClick={() => setSelectedPlace(place)}
                  className="w-full bg-white border border-[#BAE6FD] rounded-lg p-3 text-right"
                >
                  <h3 className="font-semibold text-[#0C4A6E]">{place.name}</h3>
                  {place.address && (
                    <p className="text-xs text-[#64748B] mt-1">{place.address}</p>
                  )}
                  {place.vibeTags && place.vibeTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {place.vibeTags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-[#F0F9FF] text-[#0284C7] px-2 py-0.5 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}



















