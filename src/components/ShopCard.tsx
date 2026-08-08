"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { getLiveOpeningStatus } from "@/lib/opening-hours";
import { getFontFamily } from "@/lib/fonts-helpers";
import { filterBrewMethods } from "@/lib/brew-methods";
import { getBlurPlaceholder } from "@/lib/image-utils";
import type { ShopCardProps } from "@/types/guide";

// ShopCard component for displaying individual cafe cards
const ShopCard = React.memo(function ShopCard({
  shop,
  favorites,
  onSelectShop,
  onToggleFavorite,
  index,
  distanceLabel,
  rating,
}: ShopCardProps) {
  const isMatcha = shop.type === 'matcha';
  const liveOpeningStatus = useMemo(() => getLiveOpeningStatus(shop.hours), [shop.hours]);
  // Computed once rather than filtering the list twice per render (the old
  // markup called filterBrewMethods in both the guard and the map).
  const brewMethodChips = useMemo(
    () =>
      "brewMethods" in shop && Array.isArray(shop.brewMethods)
        ? filterBrewMethods(shop.brewMethods).slice(0, 3)
        : [],
    [shop],
  );
  const isFavorite = favorites.includes(shop.id);
  const [imgError, setImgError] = useState(false);

  // Keep eager image loading minimal for faster first interaction on mobile
  const shouldPrioritize = index !== undefined && index < 2;

  return (
    // The whole card opens the cafe. This used to be attempted with a
    // "stretched link" — an `::after` on the name button, absolutely positioned
    // to inset-0 — but that never actually worked over the hero image: real
    // clicks there landed on this container, not the button, so only the name
    // itself was ever clickable. The handler lives on the card instead, which
    // is what the pattern was reaching for anyway.
    //
    // Keyboard and screen-reader users still get a real focusable <button> on
    // the name below; its click bubbles here, so both routes run the same code.
    // The favourite button stops propagation so hearting doesn't also open the
    // panel.
    <div
      onClick={() => onSelectShop(shop)}
      className="group interactive-card animate-card-in relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.08)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.12)] focus-within:ring-2 focus-within:ring-brand"
      style={index !== undefined ? { animationDelay: `${(index % 12) * 30}ms` } : undefined}
    >
      {/* Clean hero image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-900">
            <Icon name="Coffee" className="h-10 w-10 text-slate-300 dark:text-zinc-600" />
          </div>
        ) : (
          <Image
            src={shop.image}
            alt={shop.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            priority={shouldPrioritize}
            loading={shouldPrioritize ? "eager" : "lazy"}
            blurDataURL={getBlurPlaceholder(shop.image)}
            placeholder="blur"
            onError={() => setImgError(true)}
          />
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(shop.id);
          }}
          aria-label={isFavorite ? `הסר את ${shop.name} ממועדפים` : `הוסף את ${shop.name} למועדפים`}
          aria-pressed={isFavorite}
          className="absolute left-3 top-3 z-10 rounded-full bg-white/90 dark:bg-black/60 p-3 transition-colors hover:bg-white dark:hover:bg-black/75"
        >
          <Icon
            name="Heart"
            className={`h-5 w-5 transition-colors ${
              isFavorite ? "fill-brand text-brand" : "text-foreground"
            }`}
          />
        </button>
        {/* Single, restrained badge.
            No `backdrop-blur` on these or on the favourite button above: each
            one makes the browser snapshot and blur the region behind it on
            every frame the card moves, and with ~21 of them live in a
            scrolling grid that was a real cost. Both badges sit on
            near-opaque fills (95% and 55%), so the blur was barely visible
            anyway. */}
        {(isMatcha || shop.sellsBeans || distanceLabel) && (
          <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
            {isMatcha ? (
              <span className="rounded-full bg-emerald-700/95 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                מאצ&apos;ה 🍃
              </span>
            ) : shop.sellsBeans ? (
              <span className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white shadow-sm">
                מוכרים פולים
              </span>
            ) : null}
            {distanceLabel && (
              <span
                className="rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-white shadow-sm"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                {distanceLabel}
              </span>
            )}
          </div>
        )}

        {/* Open/closed lives on the photo rather than at the top of the content
            block, so the cafe's name is the first thing in the text column
            instead of competing with a status chip for the same position. The
            scrim keeps it legible over any photo. */}
        {liveOpeningStatus && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
            <span
              className={`absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
                liveOpeningStatus.tone === "open"
                  ? "bg-green-600 text-white"
                  : liveOpeningStatus.tone === "soon"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-900/80 text-slate-100"
              }`}
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {liveOpeningStatus.label}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="space-y-1">
          <h3
            className="text-xl font-bold leading-tight text-foreground"
            style={{ fontFamily: getFontFamily(shop.name) }}
          >
            {/* Keeps the cafe reachable by keyboard and gives screen readers a
                properly named control. Pointer users can click anywhere on the
                card (handler on the container above); this button's click
                bubbles up to it, so it deliberately has no onClick of its own
                and the two routes can't drift apart. */}
            <button
              type="button"
              className="block w-full truncate text-right focus:outline-none"
            >
              {shop.name}
            </button>
          </h3>
          <p
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
            style={{ fontFamily: "var(--font-aran), sans-serif" }}
          >
            <Icon name="MapPin" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{shop.location}</span>
          </p>
          {rating && (
            <p
              className="flex items-center gap-1 text-sm font-medium text-foreground"
              aria-label={`דירוג ${rating.average} מתוך 5, מבוסס על ${rating.count} ביקורות`}
            >
              <Icon
                name="Star"
                className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
              />
              <span className="tabular-nums">{rating.average.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({rating.count})
              </span>
            </p>
          )}
        </div>

        <p
          className="line-clamp-2 text-sm leading-6 text-muted-foreground"
          style={{ fontFamily: "var(--font-aran), sans-serif" }}
        >
          {shop.description}
        </p>

        {/* Craft row, pinned to the bottom edge so it lines up across a grid of
            cards whatever length each description happens to be. Roasting on
            site is a fact about the coffee, not about the room, so it gets a
            warm treatment that sets it apart from the neutral brew chips —
            previously it was crammed inline into the location line. */}
        {(shop.isRoaster || brewMethodChips.length > 0) && (
          <div className="mt-auto flex flex-col items-end gap-1.5 pt-1">
            {shop.isRoaster && (
              <span
                className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                קולים במקום
              </span>
            )}
            {brewMethodChips.length > 0 && (
              <p
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                {brewMethodChips.join(" · ")}
              </p>
            )}
          </div>
        )}

        {/* Matcha Mode: origin (compact) */}
        {"matchaOrigin" in shop && shop.matchaOrigin && (
          <div className="flex flex-wrap gap-1.5">
            <span
              className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              style={{ fontFamily: "var(--font-aran), sans-serif" }}
            >
              {shop.matchaOrigin}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

ShopCard.displayName = "ShopCard";

export default ShopCard;
