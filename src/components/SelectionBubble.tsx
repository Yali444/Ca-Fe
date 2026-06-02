"use client";

import React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Navigation, X } from "lucide-react";

import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { blueColors } from "@/components/map/map-icons";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { getFontFamily } from "@/lib/fonts-helpers";
import { openGoogleMaps } from "@/lib/share";

interface SelectionBubbleProps {
  /** Whether the bubble may show (map view active and detail panel closed). */
  visible: boolean;
  selectedShop: CoffeeShop | null;
  /** Screen-space anchor for the bubble, or null when unavailable. */
  bubblePosition: { x: number; y: number } | null;
  /** Lowers the z-index so the bubble sits behind an open sidebar. */
  sidebarOpen: boolean;
  /** Opens the full detail panel for the selected shop. */
  onOpenDetail: () => void;
  /** Dismisses the bubble (clears selection without changing zoom). */
  onClose: () => void;
}

/**
 * Circular info bubble shown on the map when a shop is selected but the full
 * detail panel is closed. Displays the shop image, name, location, a navigate
 * button and a close button, anchored at the supplied screen position.
 * Stateless — selection and position are owned by the parent.
 */
export function SelectionBubble({
  visible,
  selectedShop,
  bubblePosition,
  sidebarOpen,
  onOpenDetail,
  onClose,
}: SelectionBubbleProps) {
  return (
    <AnimatePresence>
      {visible && selectedShop && bubblePosition && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`pointer-events-auto fixed flex flex-col items-center gap-2 ${sidebarOpen ? 'z-[35]' : 'z-[9999]'}`}
          style={{
            zIndex: sidebarOpen ? 35 : 9999,
            left: `${bubblePosition.x}px`,
            top: `${bubblePosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onOpenDetail}
            className="focus:outline-none group relative h-24 w-24 overflow-hidden rounded-full"
          >
            <Image
              src={selectedShop.image}
              alt={selectedShop.name}
              fill
              className="object-cover transition-transform group-hover:scale-110"
              sizes="96px"
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </button>
          <div className="glass-card flex flex-col items-center gap-2 rounded-3xl px-6 py-3 shadow-2xl">
            <button
              type="button"
              onClick={onOpenDetail}
              className="text-sm font-bold text-[#0C4A6E] dark:text-slate-200 transition-colors hover:text-[#38BDF8] dark:hover:text-blue-400 cursor-pointer"
              style={{ fontFamily: getFontFamily(selectedShop.name) }}
            >
              {selectedShop.name}
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                  {selectedShop.location}
                </span>
                <LiquidButton
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGoogleMaps(selectedShop.lat, selectedShop.lng);
                  }}
                  size="sm"
                  className={`flex items-center gap-1 rounded-xl bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} px-2.5 py-1 text-xs font-medium text-white shadow-md ${blueColors.primary.shadow} transition-all hover:shadow-lg ${blueColors.primary.hoverShadow} hover:scale-[1.05] opacity-100`}
                  title="פתח ב-Google Maps"
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  <Navigation className="h-3 w-3" />
                  <span>נווט</span>
                </LiquidButton>
              </div>
              {selectedShop.address && (
                <span className="text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                  {selectedShop.address}
                </span>
              )}
            </div>
          </div>
          <LiquidButton
            type="button"
            onClick={onClose}
            size="icon"
            className="rounded-full p-1.5 text-[#64748B]"
          >
            <X className="h-4 w-4" />
          </LiquidButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
