import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

import { OpeningHoursDisplay } from "@/components/OpeningHoursDisplay";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { blueColors } from "@/components/map/colors";
import type { CoffeeShop } from "@/lib/coffee-shop";
import { filterBrewMethods } from "@/lib/brew-methods";
import { getFontFamily } from "@/lib/fonts-helpers";
import { getBlurPlaceholder } from "@/lib/image-utils";
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
  reviewsLoading: boolean;
  reviewsError: string | null;
  onRetryReviews: () => void;
  reviewDraft: ReviewDraft;
  setReviewDraft: Dispatch<SetStateAction<ReviewDraft>>;
  onClose: () => void;
  onToggleFavorite: (shopId: string) => void;
  onShare: (shop: CoffeeShop) => void;
  onReviewSubmit: (event: React.FormEvent) => void;
  submitError: string | null;
}

/**
 * Full-screen shop detail panel, rendered into a portal on document.body so it
 * floats above both the map and shops views. Laid out as a fixed hero, a
 * scrollable body (hours, brew methods or matcha info, vibe tags, reviews and
 * the new-review form), and a sticky "navigate" call-to-action pinned to the
 * bottom so the primary action stays in thumb reach on mobile. Stateless —
 * selected shop, reviews and the review draft are supplied by the parent.
 */
export function DetailPanel({
  selectedShop,
  detailOpen,
  isMobile,
  shareMessage,
  favorites,
  reviews,
  reviewsLoading,
  reviewsError,
  onRetryReviews,
  reviewDraft,
  setReviewDraft,
  onClose,
  onToggleFavorite,
  onShare,
  onReviewSubmit,
  submitError,
}: DetailPanelProps) {
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const isOpen = detailOpen && !!selectedShop;

  // Keyboard accessibility for the modal: Escape closes it, Tab is trapped
  // inside, and focus is restored to the trigger element on close.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {selectedShop && detailOpen && (() => {
        const isDetailMatcha = selectedShop.type === 'matcha';
        const isFavorite = favorites.includes(selectedShop.id);
        const themeSurface = isDetailMatcha
          ? "border-emerald-200 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
          : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900";
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
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={selectedShop.name}
              tabIndex={-1}
              initial={isMobile ? { y: "100%" } : { opacity: 0, y: 20, scale: 0.95 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
              exit={isMobile ? { y: "100%" } : { opacity: 0, y: 20, scale: 0.95 }}
              transition={
                isMobile
                  ? { type: "spring", damping: 34, stiffness: 330 }
                  : { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
              }
              onClick={(e) => e.stopPropagation()}
              drag={isMobile ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_event, info) => {
                if (isMobile && (info.offset.y > 120 || info.velocity.y > 600)) onClose();
              }}
              className={
                isMobile
                  ? `fixed inset-x-0 bottom-0 z-[9999] mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t shadow-2xl outline-none ${themeSurface}`
                  : `fixed left-1/2 top-1/2 z-[9999] flex w-[calc(100%-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 max-h-[88dvh] flex-col overflow-hidden rounded-3xl border-2 shadow-2xl outline-none ${themeSurface}`
              }
              style={{ fontFamily: 'var(--font-aran), var(--font-timeburner), sans-serif' }}
            >
              {/* Drag handle (mobile bottom sheet) */}
              {isMobile && (
                <div
                  onPointerDown={(event) => dragControls.start(event)}
                  className="flex flex-shrink-0 cursor-grab touch-none justify-center pt-2.5 pb-1.5 active:cursor-grabbing"
                >
                  <div className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-zinc-600" />
                </div>
              )}
              {/* Scrollable body: hero + content */}
              <div className="flex-1 overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }}>
                <div className="relative">
                  {/* The hero doubles as a drag zone on mobile: swiping down
                      anywhere on the photo dismisses the sheet (not just the
                      little handle). touch-action:none lets the drag win over
                      the body's vertical scroll for gestures starting here. */}
                  <div
                    className="relative h-56 sm:h-72 overflow-hidden"
                    onPointerDown={isMobile ? (event) => dragControls.start(event) : undefined}
                    style={isMobile ? { touchAction: 'none' } : undefined}
                  >
                    <Image
                      src={selectedShop.image}
                      alt={selectedShop.name}
                      fill
                      className="object-cover pointer-events-none"
                      sizes="(min-width: 1024px) 420px, 100vw"
                      priority
                      placeholder="blur"
                      blurDataURL={getBlurPlaceholder(selectedShop.image)}
                    />
                    {/* Gradient scrim so the overlaid buttons stay legible on any
                        photo — both edges, since external links now sit at the
                        hero's bottom-left. */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/35 pointer-events-none" />
                  </div>
                  {/* Action buttons — top-left of hero */}
                  <div className="absolute top-3 left-4 flex gap-2 z-10">
                    <LiquidButton
                      type="button"
                      onClick={() => onToggleFavorite(selectedShop.id)}
                      size="icon"
                      aria-label={isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}
                      aria-pressed={isFavorite}
                      className="rounded-full p-3 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 active:scale-95 bg-brand border border-white/25"
                    >
                      <Icon
                        name="Heart"
                        className={`h-5 w-5 transition-all ${isFavorite ? "fill-white text-white" : "text-white"}`}
                      />
                    </LiquidButton>
                    <LiquidButton
                      type="button"
                      onClick={() => onShare(selectedShop)}
                      size="icon"
                      aria-label="שתף בית קפה"
                      className="rounded-full p-3 backdrop-blur-sm shadow-lg transition-transform hover:scale-105 active:scale-95 bg-brand border border-white/25"
                      title="שתף בית קפה"
                    >
                      <Icon name="Share2" className="h-5 w-5 text-white" />
                    </LiquidButton>
                  </div>
                  {/* Close button — top-right, neutral (not alarming red) */}
                  <div className="absolute top-3 right-4 z-10">
                    <LiquidButton
                      type="button"
                      onClick={() => onClose()}
                      size="icon"
                      aria-label="סגור"
                      className="rounded-full p-3 backdrop-blur-md shadow-lg transition-transform hover:scale-105 active:scale-95 bg-black/45 border border-white/30"
                      title="סגור"
                    >
                      <Icon name="X" className="h-5 w-5 text-white" />
                    </LiquidButton>
                  </div>
                  {/* External links — kept apart from the app's own actions
                      above, so the hero isn't a single row of five circles. */}
                  {(selectedShop.instagram || selectedShop.website) && (
                    <div className="absolute bottom-3 left-4 flex gap-2 z-10">
                      {selectedShop.instagram && (
                        <LiquidButton
                          type="button"
                          onClick={() => {
                            const instagramUrl = `https://instagram.com/${selectedShop.instagram?.replace('@', '')}`;
                            window.open(instagramUrl, '_blank');
                          }}
                          size="icon"
                          aria-label="פתח אינסטגרם"
                          className="rounded-full p-3 backdrop-blur-md shadow-lg transition-transform hover:scale-105 active:scale-95 bg-black/45 border border-white/30"
                          title="פתח אינסטגרם"
                        >
                          <Icon name="Instagram" className="h-5 w-5 text-white" />
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
                          className="rounded-full p-3 backdrop-blur-md shadow-lg transition-transform hover:scale-105 active:scale-95 bg-black/45 border border-white/30"
                          title="פתח אתר"
                        >
                          <Icon name="Globe" className="h-5 w-5 text-white" />
                        </LiquidButton>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
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
                    <h3 className={`text-3xl sm:text-4xl font-bold tracking-tight transition-colors duration-300 ${
                      isDetailMatcha
                        ? "text-emerald-800 dark:text-emerald-400"
                        : "text-foreground"
                    }`} style={{ fontFamily: getFontFamily(selectedShop.name) }}>
                      {selectedShop.name}
                    </h3>
                    <p className={`mt-0.5 text-base ${
                      isDetailMatcha
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-600 dark:text-zinc-400"
                    }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                      {selectedShop.location}
                    </p>
                    {selectedShop.address && (
                      <p className={`mt-0.5 text-sm ${
                        isDetailMatcha
                          ? "text-emerald-700/80 dark:text-emerald-400/80"
                          : "text-slate-500 dark:text-zinc-500"
                      }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        {selectedShop.address}
                      </p>
                    )}
                  </div>

                  <p className={`text-base leading-relaxed ${
                    isDetailMatcha
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-slate-700 dark:text-zinc-300"
                  }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                    {selectedShop.description}
                  </p>

                  {/* Opening Hours */}
                  {selectedShop.hours && (
                    <div className={`rounded-2xl border p-4 ${
                      isDetailMatcha
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50"
                        : "bg-slate-50 dark:bg-zinc-800/50 border-slate-100 dark:border-zinc-700/50"
                    }`}>
                      <OpeningHoursDisplay openingHours={selectedShop.hours} />
                    </div>
                  )}

                  {/* Coffee Mode: brew methods */}
                  {'brewMethods' in selectedShop && selectedShop.brewMethods && Array.isArray(selectedShop.brewMethods) && filterBrewMethods(selectedShop.brewMethods).length > 0 && (
                    <div className={`rounded-2xl border p-4 ${
                      isDetailMatcha
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50"
                        : "bg-slate-50 dark:bg-zinc-800/50 border-slate-100 dark:border-zinc-700/50"
                    }`}>
                      <h4 className={`mb-3 text-xs font-semibold uppercase tracking-wide ${
                        isDetailMatcha ? "text-emerald-700 dark:text-emerald-400" : "text-[#075985] dark:text-blue-300"
                      }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        שיטות חליטה מועדפות
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {filterBrewMethods(selectedShop.brewMethods).map((method) => (
                          <span
                            key={method}
                            className={`rounded-full border px-3 py-1 text-sm transition-colors duration-300 ${
                              isDetailMatcha
                                ? "border-emerald-200 bg-white dark:border-emerald-700 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                                : "border-slate-200 bg-white dark:border-zinc-600 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-300"
                            }`}
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matcha Mode: origin + milk */}
                  {('matchaOrigin' in selectedShop || 'milkOptions' in selectedShop) && (
                    <div className="space-y-3">
                      {'matchaOrigin' in selectedShop && selectedShop.matchaOrigin && (
                        <div className="rounded-2xl border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                            מקור המאצ&apos;ה
                          </h4>
                          <span
                            className="inline-block rounded-full border border-emerald-300 bg-white dark:border-emerald-700 dark:bg-emerald-900/50 px-4 py-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-200"
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            {selectedShop.matchaOrigin}
                          </span>
                        </div>
                      )}
                      {'milkOptions' in selectedShop && selectedShop.milkOptions && (
                        <div className="rounded-2xl border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 p-4">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                            אפשרויות חלב
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedShop.milkOptions.split(",").map((option) => (
                              <span
                                key={option.trim()}
                                className="rounded-full border border-emerald-200 bg-white dark:border-emerald-700 dark:bg-emerald-900/40 px-3 py-1 text-sm text-emerald-700 dark:text-emerald-300"
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

                  {/* Vibe tags */}
                  {selectedShop.vibeTags.length > 0 && (
                    <div className={`rounded-2xl border p-4 ${
                      isDetailMatcha
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50"
                        : "bg-slate-50 dark:bg-zinc-800/50 border-slate-100 dark:border-zinc-700/50"
                    }`}>
                      <h4 className={`mb-3 text-xs font-semibold uppercase tracking-wide ${
                        isDetailMatcha ? "text-emerald-700 dark:text-emerald-400" : "text-[#075985] dark:text-blue-300"
                      }`} style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        אווירה
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedShop.vibeTags.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full border px-3 py-1 text-sm ${
                              isDetailMatcha
                                ? "border-emerald-200 bg-white dark:border-emerald-700 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                                : "border-blue-100 bg-white dark:border-zinc-600 dark:bg-zinc-700/60 text-[#075985] dark:text-blue-300"
                            }`}
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
                      <h4 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        ביקורות מהשטח
                      </h4>
                      <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        {reviews.length} ביקורות
                      </span>
                    </div>
                    <div className="glass max-h-40 space-y-3 overflow-y-auto rounded-xl p-3">
                      {reviewsError ? (
                        <div role="alert" className="flex items-center justify-between gap-2 text-sm text-red-600 dark:text-red-300" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                          <span>{reviewsError}</span>
                          <button
                            type="button"
                            onClick={onRetryReviews}
                            className="shrink-0 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-200"
                          >
                            נסה שוב
                          </button>
                        </div>
                      ) : reviewsLoading ? (
                        <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                          טוען ביקורות...
                        </p>
                      ) : reviews.length === 0 ? (
                        <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                          עדיין אין ביקורות. היו הראשונים לשתף חוויית קפה.
                        </p>
                      ) : (
                        reviews.map((review) => (
                          <div
                            key={review.id}
                            className="glass-button rounded-xl p-3 text-sm text-foreground"
                            style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                                {review.author}
                              </span>
                              <span className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                                ⭐ {review.rating}/5
                              </span>
                            </div>
                            <p className="mt-2 text-muted-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>{review.text}</p>
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
                    <h4 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                      השאירו ביקורת משלכם
                    </h4>
                    <div>
                      <label htmlFor="review-name" className="mb-1 block text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        שם פרטי
                      </label>
                      <input
                        id="review-name"
                        type="text"
                        className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all"
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
                      <label htmlFor="review-rating" className="mb-1 block text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        דירוג
                      </label>
                      <select
                        id="review-rating"
                        className="w-full rounded-lg border border-[#BAE6FD] dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-3 py-2 text-sm text-foreground focus:border-[#38BDF8] dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/60"
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
                      <label htmlFor="review-text" className="mb-1 block text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        טקסט חופשי
                      </label>
                      <textarea
                        id="review-text"
                        className="glass-input h-20 w-full rounded-xl px-4 py-2.5 text-sm text-foreground outline-none transition-all resize-none"
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
                    {submitError && (
                      <p role="alert" className="text-xs text-red-600 dark:text-red-300" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                        {submitError}
                      </p>
                    )}
                    <LiquidButton
                      type="submit"
                      size="lg"
                      className="w-full rounded-xl bg-brand py-3 text-white shadow-md transition-colors hover:bg-brand-strong"
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      שמור ביקורת
                    </LiquidButton>
                  </form>

                  {/* Secondary, low-emphasis action */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => reportPlaceIssue(selectedShop)}
                      className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-slate-800 dark:hover:text-slate-300"
                      style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                    >
                      דווח על טעות בפרטים
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky primary action — always in thumb reach */}
              <div
                className={`flex-shrink-0 border-t px-4 pt-3 backdrop-blur-md ${
                  isDetailMatcha
                    ? "border-emerald-200/70 dark:border-emerald-800/70 bg-emerald-50/85 dark:bg-emerald-950/85"
                    : "border-slate-200/70 dark:border-zinc-800/70 bg-white/85 dark:bg-zinc-900/85"
                }`}
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
              >
                <LiquidButton
                  type="button"
                  onClick={() => openGoogleMaps(selectedShop.lat, selectedShop.lng)}
                  size="lg"
                  aria-label="נווט"
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] ${
                    isDetailMatcha
                      ? "bg-brand hover:bg-brand-strong shadow-brand/40"
                      : `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} ${blueColors.primary.shadow} ${blueColors.primary.hoverShadow}`
                  }`}
                  style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                >
                  <span>נווט</span>
                  <Icon name="Navigation" className="h-5 w-5" />
                </LiquidButton>
              </div>
            </motion.div>
          </>
        );
      })()}
    </AnimatePresence>,
    document.body
  );
}
