"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation, Instagram, Clock, Flame, ShoppingBag, Globe } from "lucide-react";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import ReviewSection from "@/components/ReviewSection";
import { useMode } from "@/contexts/ModeContext";
import { getModeColors } from "@/lib/theme-utils";
import { instagramUrl, isPlaceOpen } from "@/lib/formatters";
import type { Place, OpeningHours } from "@/types/place";

interface PlaceDetailsModalProps {
  place: Place | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to detect if text contains Latin/English characters
const hasLatinCharacters = (text: string): boolean => {
  return /[A-Za-z]/.test(text);
};

// Helper function to get font family based on text content
const getFontFamily = (text: string): string => {
  if (hasLatinCharacters(text)) {
    return 'var(--font-timeburner), sans-serif';
  }
  return 'var(--font-aran), sans-serif';
};

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

export function PlaceDetailsModal({ place, isOpen, onClose }: PlaceDetailsModalProps) {
  const { appMode } = useMode();
  const colors = getModeColors(appMode);

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!place) return null;

  // Determine theme based on place type, not app mode
  // Coffee is the default, only use matcha theme if place.type === 'matcha'
  const isMatcha = place.type === 'matcha';
  const isOpenNow = isPlaceOpen(place.openingHours);
  const imageUrl = place.heroImage || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop";

  const openGoogleMaps = () => {
    if (place.latitude && place.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const openWaze = () => {
    if (place.latitude && place.longitude) {
      const url = `https://waze.com/ul?ll=${place.latitude},${place.longitude}&navigate=yes`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal - Centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl shadow-2xl pointer-events-auto ${
                isMatcha
                  ? "bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-500"
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"
              }`}
            >
              {/* Close Button */}
              <LiquidButton
                type="button"
                onClick={onClose}
                size="icon"
                className={`absolute right-3 top-3 z-10 rounded-full p-2 ${
                  isMatcha
                    ? "bg-emerald-100/80 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400"
                    : "bg-white/80 dark:bg-zinc-800 text-[#0284C7] dark:text-blue-400"
                }`}
              >
                <X className="h-4 w-4" />
              </LiquidButton>

              {/* Hero Image */}
              <div className="relative h-48 sm:h-56 md:h-64 w-full overflow-hidden">
                <img
                  src={imageUrl}
                  alt={place.name}
                  className={`h-full w-full object-cover transition-all duration-300 ${
                    !isOpenNow ? "grayscale opacity-70" : ""
                  }`}
                />
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
                      isOpenNow
                        ? "bg-green-500 text-white"
                        : "bg-gray-600 text-white"
                    }`}
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                  >
                    {isOpenNow ? "פתוח" : "סגור"}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-16rem)] p-4 md:p-6">
                {/* Title & City */}
                <div className="mb-4">
                  <h2
                    className={`text-2xl md:text-3xl font-bold mb-1 ${
                      isMatcha
                        ? "text-emerald-800 dark:text-emerald-400"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                    style={{ fontFamily: getFontFamily(place.name) }}
                  >
                    {place.name}
                  </h2>
                  {place.city && (
                    <p
                      className={`text-sm md:text-base ${
                        isMatcha
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-slate-600 dark:text-zinc-400"
                      }`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      {place.city}
                    </p>
                  )}
                  {place.address && (
                    <p
                      className={`text-xs md:text-sm mt-1 ${
                        isMatcha
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-slate-600 dark:text-zinc-400"
                      }`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      {place.address}
                    </p>
                  )}
                </div>

                {/* Opening Hours */}
                {place.openingHours && (
                  <div className="mb-4 flex items-center gap-2">
                    <Clock
                      className={`h-4 w-4 ${
                        isMatcha
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-slate-600 dark:text-zinc-400"
                      }`}
                    />
                    <p
                      className={`text-xs md:text-sm ${
                        isMatcha
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-slate-600 dark:text-zinc-400"
                      }`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      {typeof place.openingHours === 'string' 
                        ? place.openingHours 
                        : formatOpeningHours(place.openingHours)}
                    </p>
                  </div>
                )}

                {/* Description */}
                <div className="mb-4">
                  <p
                    className={`text-sm md:text-base leading-relaxed ${
                      isMatcha
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-600 dark:text-zinc-400"
                    }`}
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                  >
                    {place.description}
                  </p>
                </div>

                {/* Brew Methods (Coffee) */}
                {place.brewMethods && place.brewMethods.length > 0 && (
                  <div className="mb-4">
                    <h3
                      className={`text-xs md:text-sm font-semibold uppercase mb-2 ${
                        isMatcha
                          ? "text-emerald-800 dark:text-emerald-400"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      שיטות חליטה
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {place.brewMethods.map((method) => (
                        <span
                          key={method}
                          className={`rounded-full px-3 py-1 text-xs ${
                            isMatcha
                              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500"
                              : "bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800"
                          }`}
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vibe Tags */}
                {place.vibeTags && place.vibeTags.length > 0 && (
                  <div className="mb-4">
                    <h3
                      className={`text-xs md:text-sm font-semibold uppercase mb-2 ${
                        isMatcha
                          ? "text-emerald-800 dark:text-emerald-400"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      אווירה
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {place.vibeTags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full px-3 py-1 text-xs ${
                            isMatcha
                              ? "bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500"
                              : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800"
                          }`}
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roaster & Beans Badges */}
                {(place.isRoaster || place.sellsBeans) && (
                  <div className="mb-4">
                    <h3
                      className={`text-xs md:text-sm font-semibold uppercase mb-2 ${
                        isMatcha
                          ? "text-emerald-800 dark:text-emerald-400"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      תגיות
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {place.isRoaster && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700 px-3 py-1 text-xs font-medium"
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          <Flame className="h-3.5 w-3.5" />
                          בית קלייה
                        </span>
                      )}
                      {place.sellsBeans && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-3 py-1 text-xs font-medium"
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          מכירת פולים
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigate Button */}
                {place.latitude && place.longitude && (
                  <div className="mb-4 flex flex-col sm:flex-row gap-2">
                    <LiquidButton
                      type="button"
                      onClick={openGoogleMaps}
                      className={`w-full sm:flex-1 rounded-xl py-3 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] ${
                        isMatcha
                          ? "bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-emerald-500/50 hover:shadow-emerald-500/75"
                          : `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} ${colors.primary.shadow} ${colors.primary.hoverShadow}`
                      }`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      <Navigation className="h-4 w-4 inline-block mr-2" />
                      נווט ב-Google Maps
                    </LiquidButton>
                    <LiquidButton
                      type="button"
                      onClick={openWaze}
                      className={`w-full sm:flex-1 rounded-xl py-3 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] ${
                        isMatcha
                          ? "bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-emerald-500/50 hover:shadow-emerald-500/75"
                          : "bg-gradient-to-r from-blue-600 to-blue-700 shadow-blue-500/50 hover:shadow-blue-500/75"
                      }`}
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      <Navigation className="h-4 w-4 inline-block mr-2" />
                      נווט ב-Waze
                    </LiquidButton>
                  </div>
                )}

                {/* Instagram and Website Links */}
                {(place.instagramHandle || place.website) && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {place.instagramHandle && instagramUrl(place.instagramHandle) && (
                      <LiquidButton
                        type="button"
                        onClick={() =>
                          window.open(
                            instagramUrl(place.instagramHandle) || "",
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        className={`w-full ${place.website ? 'sm:flex-1' : ''} rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]`}
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        <Instagram className="h-4 w-4 inline-block mr-2" />
                        Instagram
                      </LiquidButton>
                    )}
                    {place.website && (
                      <LiquidButton
                        type="button"
                        onClick={() =>
                          window.open(
                            place.website || "",
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        className={`w-full ${place.instagramHandle ? 'sm:flex-1' : ''} rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]`}
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        <Globe className="h-4 w-4 inline-block mr-2" />
                        אתר
                      </LiquidButton>
                    )}
                  </div>
                )}

                {/* Reviews Section */}
                <ReviewSection placeId={place.id} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


