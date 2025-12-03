"use client";

import React from 'react';
import { MapPin, Instagram, Globe } from 'lucide-react';
import { Roastery } from '@/types/roastery';
import { MatchaPlace } from '@/data/matcha';

type PlaceMode = 'coffee' | 'matcha';

interface PlaceCardProps {
  place: Roastery | MatchaPlace;
  mode: PlaceMode;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, mode }) => {
  // Theme configuration based on mode
  const theme = {
    coffee: {
      border: 'border-slate-200',
      bg: 'bg-white',
      badge: 'bg-blue-100 text-blue-800',
      accent: 'text-blue-600',
      hover: 'hover:border-blue-300 hover:shadow-blue-100/50',
    },
    matcha: {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/30',
      badge: 'bg-emerald-100 text-emerald-800',
      accent: 'text-emerald-600',
      hover: 'hover:border-emerald-300 hover:shadow-emerald-100/50',
    }
  }[mode];

  // Type Guard: Check if it's a Roastery by checking for the specific field
  const isRoastery = (p: any): p is Roastery => 'brewMethods' in p;
  
  return (
    <div className={`group relative flex flex-col rounded-xl border ${theme.border} ${theme.bg} p-4 transition-all duration-300 hover:shadow-lg ${theme.hover} h-full`}>
      
      {/* Header: Name & City */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-bold text-lg text-slate-900 leading-tight">
            {place.name}
          </h3>
          <div className="flex items-center text-slate-500 text-sm mt-1">
            <MapPin className="w-3 h-3 mr-1" />
            {place.city || 'לא צוין'}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-600 text-sm line-clamp-3 mb-4 leading-relaxed flex-grow">
        {place.description}
      </p>

      {/* Dynamic Data Section: Brew Methods vs. Origin/Milk - type-safe rendering */}
      <div className="mt-auto space-y-3">
        {'brewMethods' in place && place.brewMethods && Array.isArray(place.brewMethods) && place.brewMethods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {place.brewMethods.map((method) => (
              <span key={method} className={`px-2 py-1 rounded-md text-xs font-medium ${theme.badge}`}>
                {method}
              </span>
            ))}
          </div>
        )}

        <div className="h-px w-full bg-slate-100 my-3" />

        {/* Footer: Links & Vibe */}
        <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {place.instagramHandle && (
                <a 
                  href={`https://instagram.com/${place.instagramHandle}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`transition-colors ${theme.accent} hover:opacity-80`}
                >
                  <Instagram size={18} />
                </a>
              )}
              {place.website && (
                <a 
                  href={place.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`transition-colors ${theme.accent} hover:opacity-80`}
                >
                  <Globe size={18} />
                </a>
              )}
            </div>
            
            <div className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-full">
                {place.vibeTags?.[0] || 'איכותי'}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;


