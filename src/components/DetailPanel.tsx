import type { Dispatch, SetStateAction } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Heart, Instagram, Navigation, Share2, X } from "lucide-react";

import { OpeningHoursDisplay } from "@/components/OpeningHoursDisplay";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { blueColors } from "@/components/map/map-icons";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { filterBrewMethods } from "@/lib/brew-methods";
import { getFontFamily } from "@/lib/fonts-helpers";
import { reportPlaceIssue } from "@/lib/report";
import { openGoogleMaps } from "@/lib/share";
import type { Review } from "@/types/roastery";
import type { ReviewDraft } from "@/hooks/useReviews";

interface DetailPanelProps {
  selectedShop: CoffeeShop | null;
  detailOpen: boolean;
  isMobile: boolean;
  /** Transient share-confirmation message, shown at the top of the content. */
  shareMessage: string | null;
  favorites: string[];
  reviews: Review[];
  reviewDraft: ReviewDraft;
  setReviewDraft: Dispatch<SetStateAction<ReviewDraft>>;
  onClose: () => void;
  onToggleFavorite: (shopId: string) => void;
  onShare: (shop: CoffeeShop) => void;
  onReviewSubmit: (event: React.FormEvent) => void;
}

/**
 * Full-screen shop detail panel, rendered into a portal on document.body so it
 * floats above both the map and shops views. Shows the hero image, action
 * buttons (favorite/share/instagram/website), details (hours, brew methods or
 * matcha info, vibe tags), the reviews list, and the new-review form. Stateless
 * — selected shop, reviews and the review draft are supplied by the parent.
 */
export function DetailPanel({
  selectedShop,
  detailOpen,
  isMobile,
  shareMessage,
  favorites,
  reviews,
  reviewDraft,
  setReviewDraft,
  onClose,
  onToggleFavorite,
  onShare,
  onReviewSubmit,
}: DetailPanelProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {selectedShop && detailOpen && (() => {
        const isDetailMatcha = selectedShop.type === 'matcha';
        return (
          <>
            {/* Full-screen backdrop with blur */}
            <motion.div
              key="detail-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={() => onClose()}
              className="fixed inset-0 z-[9998] backdrop-blur-xl backdrop-saturate-[1.2] bg-black/30"
              style={{ WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }}
            />
            <motion.div
              key="detail-panel"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={(e) => e.stopPropagation()}
              className={`fixed left-1/2 top-1/2 z-[9999] ${isMobile ? 'w-[calc(100%-32px)] max-w-lg' : 'w-[calc(100%-32px)] max-w-xl'} -translate-x-1/2 -translate-y-1/2 max-h-[85vh] overflow-y-auto overscroll-contain rounded-3xl border-2 shadow-2xl ${
                isDetailMatcha
                  ? "border-emerald-200 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                  : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}
              style={{
                fontFamily: 'var(--font-aran), var(--font-timeburner), sans-serif',
                touchAction: 'pan-y',
                ...(isMobile && {
                  paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
                }),
              }}
            >
            <div className="relative">
              <div className="relative h-48 overflow-hidden rounded-t-3xl">
                <Image
                  src={selectedShop.image}
                  alt={selectedShop.name}
                  fill
                  className="object-cover pointer-events-none"
                  sizes="(min-width: 1024px) 420px, 100vw"
                  priority
                />
              </div>
              {/* Action buttons — outside overflow-hidden, top-left of hero */}
              <div className="absolute top-3 left-4 flex gap-2 z-10">
                <LiquidButton
                  type="button"
                  onClick={() => onToggleFavorite(selectedShop.id)}
                  size="icon"
                  aria-label={favorites.includes(selectedShop.id) ? "הסר ממועדפים" : "הוסף למועדפים"}
                  aria-pressed={favorites.includes(selectedShop.id)}
                  className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 ${
                    isDetailMatcha
                      ? "bg-[#0071E3]/90 border border-[#0071E3]/50"
                      : "bg-blue-500/90 border border-blue-400/50"
                  }`}
                >
                  <Heart
                    className={`h-5 w-5 transition-all ${
                      favorites.includes(selectedShop.id)
                        ? "fill-white text-white"
                        : "text-white"
                    }`}
                  />
                </LiquidButton>
                <LiquidButton
                  type="button"
                  onClick={() => onShare(selectedShop)}
                  size="icon"
                  aria-label="שתף בית קפה"
                  className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 ${
                    isDetailMatcha
                      ? "bg-[#0071E3]/90 border border-[#0071E3]/50"
                      : "bg-blue-500/90 border border-blue-400/50"
                  }`}
                  title="שתף בית קפה"
                >
                  <Share2 className="h-5 w-5 text-white" />
                </LiquidButton>
                {selectedShop.instagram && (
                  <LiquidButton
                    type="button"
                    onClick={() => {
                      const instagramUrl = `https://instagram.com/${selectedShop.instagram?.replace('@', '')}`;
                      window.open(instagramUrl, '_blank');
                    }}
                    size="icon"
                    aria-label="פתח אינסטגרם"
                    className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 ${
                      isDetailMatcha
                        ? "bg-[#0071E3]/90 border border-[#0071E3]/50"
                        : "bg-blue-500/90 border border-blue-400/50"
                    }`}
                    title="פתח אינסטגרם"
                  >
                    <Instagram className="h-5 w-5 text-white" />
                  </LiquidButton>
                )}
                {selectedShop.website && (
                  <LiquidButton
                    type="button"
                    onClick={() => {
                      if (selectedShop.website) {
                        window.open(selectedShop.website, '_blank');
                      }
                    }}
                    size="icon"
                    aria-label="פתח אתר"
                    className={`rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 ${
                      isDetailMatcha
                        ? "bg-[#0071E3]/90 border border-[#0071E3]/50"
                        : "bg-blue-500/90 border border-blue-400/50"
                    }`}
                    title="פתח אתר"
                  >
                    <Globe className="h-5 w-5 text-white" />
                  </LiquidButton>
                )}
              </div>
              {/* Close button — top-right */}
              <div className="absolute top-3 right-4 z-10">
                <LiquidButton
                  type="button"
                  onClick={() => onClose()}
                  size="icon"
                  aria-label="סגור"
                  className="rounded-full p-2.5 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 bg-red-500/90 border border-red-400/50"
                  title="סגור"
                >
                  <X className="h-5 w-5 text-white" />
                </LiquidButton>
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="p-6 space-y-6" style={{ fontFamily: 'var(--font-aran), var(--font-timeburner), sans-serif' }}>
              {shareMessage && (
                <div className={`text-center text-xs font-medium rounded-full px-3 py-2 inline-flex items-center justify-center shadow-sm ${
                  isDetailMatcha
                    ? "bg-emerald-100/90 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700"
                    : "bg-blue-50/90 text-blue-800 border border-blue-200 dark:bg-slate-800/70 dark:text-slate-100 dark:border-slate-700"
                }`}>
                  {shareMessage}
                </div>
              )}
              <div>
                <h3 className={`text-2xl font-bold transition-colors duration-300 ${
                  isDetailMatcha
                    ? "text-emerald-800 dark:text-emerald-400"
                    : "text-slate-900 dark:text-slate-100"
                }`} style={{ fontFamily: getFontFamily(selectedShop.name) }}>
                  {selectedShop.name}
                </h3>
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${
                    isDetailMatcha
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-slate-600 dark:text-zinc-400"
                  }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    {selectedShop.location}
                  </p>
                  <LiquidButton
                    type="button"
                    onClick={() => openGoogleMaps(selectedShop.lat, selectedShop.lng)}
                    size="sm"
                    className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] opacity-100 ${
                      isDetailMatcha
                        ? "bg-[#0071E3] hover:bg-[#005BB5] shadow-[#0071E3]/50 hover:shadow-[#0071E3]/75"
                        : `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} ${blueColors.primary.shadow} ${blueColors.primary.hoverShadow}`
                    }`}
                    title="פתח ב-Google Maps"
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                  >
                    <Navigation className="h-3 w-3" />
                    <span>נווט</span>
                  </LiquidButton>
                  <LiquidButton
                    type="button"
                    onClick={() => reportPlaceIssue(selectedShop)}
                    size="sm"
                    className="rounded-xl bg-[#0071E3] px-3 py-1.5 text-xs text-white shadow-sm transition-colors hover:bg-[#0062c4]"
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                  >
                    דווח טעות
                  </LiquidButton>
                </div>
                {selectedShop.address && (
                  <p className={`text-xs mt-1 ${
                    isDetailMatcha
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-slate-600 dark:text-zinc-400"
                  }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    {selectedShop.address}
                  </p>
                )}
              </div>

              <p className={`text-sm leading-relaxed ${
                isDetailMatcha
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-slate-600 dark:text-zinc-400"
              }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                {selectedShop.description}
              </p>

              {/* Opening Hours - unified display (handles both structured and string formats) */}
              {selectedShop.hours && (
                <OpeningHoursDisplay openingHours={selectedShop.hours} className="mb-4" />
              )}

              {/* Coffee Mode: Show brew methods - type-safe check */}
              {'brewMethods' in selectedShop && selectedShop.brewMethods && Array.isArray(selectedShop.brewMethods) && filterBrewMethods(selectedShop.brewMethods).length > 0 && (
                <div>
                  <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${blueColors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    שיטות חליטה מועדפות
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {filterBrewMethods(selectedShop.brewMethods).map((method) => (
                      <span
                        key={method}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors duration-300 ${
                          isDetailMatcha
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                        }`}
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Matcha Mode: Show matcha origin and milk options - type-safe checks */}
              {('matchaOrigin' in selectedShop || 'milkOptions' in selectedShop) && (
                <div className="space-y-4">
                  {'matchaOrigin' in selectedShop && selectedShop.matchaOrigin && (
                    <div>
                      <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${blueColors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        מקור המאצ&apos;ה
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className="rounded-full border border-emerald-300 bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/50 px-4 py-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-200"
                          style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                        >
                          {selectedShop.matchaOrigin}
                        </span>
                      </div>
                    </div>
                  )}
                  {'milkOptions' in selectedShop && selectedShop.milkOptions && (
                    <div>
                      <h4 className={`mb-2 text-xs font-semibold uppercase transition-colors duration-300 ${blueColors.primary.text}`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        אפשרויות חלב
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedShop.milkOptions.split(",").map((option) => (
                          <span
                            key={option.trim()}
                            className="rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300"
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            {option.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedShop.vibeTags.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-[#075985] dark:text-blue-300" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    אווירה
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedShop.vibeTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#fff] dark:bg-slate-800 px-3 py-1 text-xs text-[#075985] dark:text-blue-300"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#0C4A6E] dark:text-slate-200" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    ביקורות מהשטח
                  </h4>
                  <span className="text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    {reviews.length} ביקורות
                  </span>
                </div>
                <div className="glass max-h-40 space-y-3 overflow-y-auto rounded-xl p-3">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                      עדיין אין ביקורות. היו הראשונים לשתף חוויית קפה.
                    </p>
                  ) : (
                    reviews.map((review) => (
                      <div
                        key={review.id}
                        className="glass-button rounded-xl p-3 text-sm text-[#0C4A6E] dark:text-slate-200"
                        style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                            {review.author}
                          </span>
                          <span className="text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                            ⭐ {review.rating}/5
                          </span>
                        </div>
                        <p className="mt-2 text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>{review.text}</p>
                        {review.source && (
                          <span className="mt-2 block text-xs text-[#38BDF8]" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                            {review.source}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form
                className="glass space-y-3 rounded-2xl border border-dashed border-white/30 p-4"
                onSubmit={onReviewSubmit}
                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
              >
                <h4 className="text-sm font-semibold text-[#0C4A6E] dark:text-slate-200" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                  השאירו ביקורת משלכם
                </h4>
                <div>
                  <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    שם פרטי
                  </label>
                  <input
                    type="text"
                    className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-[#0C4A6E] dark:text-slate-200 outline-none transition-all"
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    value={reviewDraft.name}
                    onChange={(event) =>
                      setReviewDraft((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="איך נציג אותך?"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    דירוג
                  </label>
                  <select
                    className="w-full rounded-lg border border-[#BAE6FD] dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm text-[#0C4A6E] dark:text-slate-200 focus:border-[#38BDF8] dark:focus:border-blue-400 focus:outline-none"
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    value={reviewDraft.rating}
                    onChange={(event) =>
                      setReviewDraft((prev) => ({
                        ...prev,
                        rating: Number(event.target.value),
                      }))
                    }
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value} ⭐
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#64748B] dark:text-slate-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    טקסט חופשי
                  </label>
                  <textarea
                    className="glass-input h-20 w-full rounded-xl px-4 py-2.5 text-sm text-[#0C4A6E] dark:text-slate-200 outline-none transition-all resize-none"
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    value={reviewDraft.text}
                    onChange={(event) =>
                      setReviewDraft((prev) => ({
                        ...prev,
                        text: event.target.value,
                      }))
                    }
                    placeholder="מה אהבתם בקפה, בשירות או באווירה?"
                  />
                </div>
                <LiquidButton
                  type="submit"
                  size="lg"
                  className={`w-full rounded-xl bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} py-3 text-white shadow-lg ${blueColors.primary.shadow} transition-all hover:shadow-xl ${blueColors.primary.hoverShadow} hover:scale-[1.02]`}
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  שמור ביקורת
                </LiquidButton>
              </form>
            </div>
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>,
    document.body
  );
}
