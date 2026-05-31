"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Flame, ShoppingBag, Navigation } from "lucide-react";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { OpeningHoursDisplay } from "@/components/OpeningHoursDisplay";
import { getLiveOpeningStatus } from "@/lib/opening-hours";
import { getFontFamily } from "@/lib/fonts-helpers";
import { filterBrewMethods } from "@/lib/brew-methods";
import { openGoogleMaps } from "@/lib/share";
import { getBlurPlaceholder } from "@/lib/image-utils";
import { blueColors, greenColors } from "@/components/map/map-icons";
import type { ShopCardProps } from "@/types/guide";

// ShopCard component for displaying individual cafe cards
const ShopCard = React.memo(function ShopCard({
  shop,
  favorites,
  onSelectShop,
  onToggleFavorite,
  index,
}: ShopCardProps) {
  // Theme helper: check if this is a matcha place
  const isMatcha = shop.type === 'matcha';
  const colors = isMatcha ? greenColors : blueColors;
  const liveOpeningStatus = useMemo(() => getLiveOpeningStatus(shop.hours), [shop.hours]);

  // Keep eager image loading minimal for faster first interaction on mobile
  const shouldPrioritize = index !== undefined && index < 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group interactive-card overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
        isMatcha
          ? "border-2 border-emerald-400 dark:border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/60 dark:to-emerald-800/40"
          : "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      } flex flex-col h-full`}
      role="button"
      tabIndex={0}
      onClick={() => onSelectShop(shop)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelectShop(shop);
      }}
    >
      <div className="relative h-56 mx-1 mt-1 overflow-hidden rounded-xl">
        <Image
          src={shop.image}
          alt={shop.name}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          priority={shouldPrioritize}
          loading={shouldPrioritize ? "eager" : "lazy"}
          blurDataURL={getBlurPlaceholder(shop.image)}
          placeholder="blur"
        />
        <LiquidButton
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(shop.id);
          }}
          size="icon"
          className="absolute left-4 top-4 rounded-full p-2.5"
        >
          <Heart
            className={`h-5 w-5 transition-all ${
              favorites.includes(shop.id)
                ? "fill-[#0071E3] text-[#0071E3]"
                : "text-white"
            }`}
          />
        </LiquidButton>
        {/* Matcha Badge */}
        {isMatcha && (
          <div className="absolute right-4 top-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm border border-emerald-400/50">
            מאצ&apos;ה 🍃
          </div>
        )}
        {/* Sells Beans Badge */}
        {shop.sellsBeans && !isMatcha && (
          <div className="absolute right-4 top-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm bg-opacity-90">
            מוכרים פולים
          </div>
        )}
        <div className="absolute bottom-0 right-0 left-0 px-3 pb-3">
          <div className={`rounded-xl px-4 py-2.5 backdrop-blur-sm border shadow-sm flex flex-col gap-1.5 ${
              isMatcha
                ? "bg-emerald-100/90 dark:bg-emerald-800/90 border-emerald-300 dark:border-emerald-500"
                : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
            }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <h3
                  className={`text-lg font-bold leading-tight transition-colors duration-300 ${
                    isMatcha
                      ? "text-emerald-800 dark:text-emerald-400"
                      : "text-[#0C4A6E] dark:text-blue-200"
                  }`}
                  style={{ fontFamily: getFontFamily(shop.name) }}
                >
                  <span className="flex items-center gap-2">
                    <span className="block truncate">{shop.name}</span>
                    {shop.sellsBeans && (
                      <span className="flex-shrink-0" title="מוכרים פולים">
                        🛍️
                      </span>
                    )}
                  </span>
                </h3>
                <p
                  className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 flex-wrap"
                  style={{ fontFamily: "var(--font-aran), sans-serif" }}
                >
                  {shop.location}
                  {shop.isRoaster && (
                    <span title="בית קלייה">
                      <Flame
                        className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400"
                      />
                    </span>
                  )}
                  {shop.sellsBeans && (
                    <span title="מכירת פולים">
                      <ShoppingBag
                        className="h-3.5 w-3.5 text-amber-700 dark:text-amber-500"
                      />
                    </span>
                  )}
                  {shop.isRoaster && (
                    <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      קולים במקום
                    </span>
                  )}
                </p>
              </div>
              <LiquidButton
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openGoogleMaps(shop.lat, shop.lng);
                }}
                size="sm"
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.05] opacity-100 shrink-0 ${
                  isMatcha
                    ? `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} ${colors.primary.shadow} ${colors.primary.hoverShadow}`
                    : `bg-gradient-to-r ${colors.primary.gradient} ${colors.primary.gradientDark} ${colors.primary.shadow} ${colors.primary.hoverShadow}`
                }`}
                title="פתח ב-Google Maps"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                <Navigation className="h-3 w-3" />
                <span>נווט</span>
              </LiquidButton>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1 min-h-[220px]">
        {liveOpeningStatus && (
          <div className="mb-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                liveOpeningStatus.tone === "open"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                  : liveOpeningStatus.tone === "soon"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                    : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
              }`}
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              {liveOpeningStatus.label}
            </span>
          </div>
        )}
        <p className="text-sm leading-relaxed text-[#64748B] dark:text-slate-400 line-clamp-3">
          {shop.description}
        </p>

        {/* Coffee Mode: Show brew methods */}
        {"brewMethods" in shop &&
          shop.brewMethods &&
          Array.isArray(shop.brewMethods) &&
          filterBrewMethods(shop.brewMethods).length > 0 && (
            <div className="mb-4">
              <h4
                className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${colors.primary.text}`}
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                שיטות חליטה
              </h4>
              <div className="flex flex-wrap gap-1">
                {filterBrewMethods(shop.brewMethods).map((method) => (
                  <span
                    key={method}
                    className={`rounded-full border px-2 py-1 text-xs transition-colors duration-300 ${
                      isMatcha
                        ? "border-emerald-300 bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400"
                        : "border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                    }`}
                    style={{ fontFamily: "var(--font-aran), sans-serif" }}
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Matcha Mode: Show matcha origin badge */}
        {"matchaOrigin" in shop && shop.matchaOrigin && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-full border border-emerald-300 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/60 px-3 py-1 text-xs font-medium text-emerald-800 dark:text-emerald-300"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                {shop.matchaOrigin}
              </span>
            </div>
          </div>
        )}

        {/* Matcha Mode: Show milk options */}
        {"milkOptions" in shop && shop.milkOptions && (
          <div className="mb-4">
            <h4
              className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${colors.primary.text}`}
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              אפשרויות חלב
            </h4>
            <div className="flex flex-wrap gap-1">
              {shop.milkOptions.split(",").map((option) => (
                <span
                  key={option.trim()}
                  className="rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/30 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400"
                  style={{ fontFamily: "var(--font-aran), sans-serif" }}
                >
                  {option.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Opening Hours - unified display (handles both structured and string formats) */}
        {shop.hours && (
          <OpeningHoursDisplay openingHours={shop.hours} className="mb-4" />
        )}
      </div>
    </motion.div>
  );
});

ShopCard.displayName = "ShopCard";

export default ShopCard;
