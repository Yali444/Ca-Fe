"use client";

import React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

import { LiquidButton } from "@/components/ui/liquid-glass-button";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { getFontFamily } from "@/lib/fonts-helpers";
import { getBlurPlaceholder } from "@/lib/image-utils";
import { openGoogleMaps } from "@/lib/share";

interface SelectionBubbleProps {
  /** Whether the card may show (map view active and detail panel closed). */
  visible: boolean;
  selectedShop: CoffeeShop | null;
  /** Lowers the z-index so the card sits behind an open sidebar/drawer. */
  sidebarOpen: boolean;
  /** Opens the full detail panel for the selected shop. */
  onOpenDetail: () => void;
  /** Dismisses the card (clears selection without changing zoom). */
  onClose: () => void;
}

/**
 * On-map preview card for the selected shop, shown while the full detail panel
 * is closed. Anchored to a fixed bottom-centre position (above the action bar)
 * so it appears in the same orderly place every time and never overflows the
 * screen — no matter where the tapped marker sits. Tapping the card opens the
 * full detail panel; the map is never moved. Stateless — selection is owned by
 * the parent.
 */
export function SelectionBubble({
  visible,
  selectedShop,
  sidebarOpen,
  onOpenDetail,
  onClose,
}: SelectionBubbleProps) {
  return (
    <AnimatePresence>
      {visible && selectedShop && (
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ type: "spring", damping: 30, stiffness: 320 }}
          className={`pointer-events-none fixed inset-x-0 flex justify-center px-3 ${
            sidebarOpen ? "z-[35]" : "z-[9998]"
          }`}
          style={{
            // Sit just above the bottom action bar and the mobile safe area.
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
          }}
        >
          <div
            className="pointer-events-auto relative flex w-full max-w-md items-center gap-3 rounded-3xl border border-white/40 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-2.5 shadow-2xl"
            dir="rtl"
            role="dialog"
            aria-label={selectedShop.name}
          >
            {/* Thumbnail — opens the full detail panel */}
            <button
              type="button"
              onClick={onOpenDetail}
              aria-label={`פתח פרטים על ${selectedShop.name}`}
              className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Image
                src={selectedShop.image}
                alt={selectedShop.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="64px"
                placeholder="blur"
                blurDataURL={getBlurPlaceholder(selectedShop.image)}
              />
            </button>

            {/* Name + location — also opens the full detail panel */}
            <button
              type="button"
              onClick={onOpenDetail}
              className="min-w-0 flex-1 text-right focus:outline-none"
            >
              <span
                className="block truncate text-sm font-bold text-foreground"
                style={{ fontFamily: getFontFamily(selectedShop.name) }}
              >
                {selectedShop.name}
              </span>
              <span
                className="block truncate text-xs text-muted-foreground"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                {selectedShop.location}
                {selectedShop.address ? ` · ${selectedShop.address}` : ""}
              </span>
              <span
                className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-brand dark:text-blue-400"
                style={{ fontFamily: "var(--font-aran), sans-serif" }}
              >
                לפרטים נוספים
                <Icon name="ChevronLeft" className="h-3 w-3" />
              </span>
            </button>

            {/* Navigate — primary action */}
            <LiquidButton
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openGoogleMaps(selectedShop.lat, selectedShop.lng);
              }}
              size="icon"
              aria-label="נווט ב-Google Maps"
              title="נווט ב-Google Maps"
              className="shrink-0 rounded-full bg-brand p-3 text-white shadow-md shadow-brand/30 transition-[background-color,transform] hover:bg-brand-strong active:scale-95"
            >
              <Icon name="Navigation" className="h-5 w-5" />
            </LiquidButton>

            {/* Close — floated at the card's leading-top corner */}
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-muted-foreground shadow-md transition-colors hover:text-foreground after:absolute after:-inset-3 after:content-['']"
            >
              <Icon name="X" className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
