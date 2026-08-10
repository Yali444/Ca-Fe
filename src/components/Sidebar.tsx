import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

import { FilterChip } from "@/components/ui/FilterChip";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BREW_METHODS } from "@/lib/brew-methods";

type GuideView = "map" | "shops" | "about";

interface SidebarProps {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  isMobile: boolean;
  prefersReducedMotion: boolean;
  /** Toggle the mobile sidebar (also clears any open detail/selection). */
  onToggleOpen: () => void;
  /** Close the mobile sidebar (overlay tap). */
  onCloseSidebar: () => void;
  /** Collapse/expand the desktop sidebar rail. */
  onToggleCollapsed: () => void;
  /** Hide the floating mobile menu button (e.g. while a fullscreen overlay
   *  like the detail panel or mobile search is open, so it doesn't collide
   *  with that overlay's own controls). */
  menuButtonHidden?: boolean;

  activeView: GuideView;
  /** Switch view (clears detail/selection and closes the sidebar on mobile). */
  onNavigate: (view: GuideView) => void;

  addressQuery: string;
  onAddressQueryChange: (value: string) => void;
  isGeocoding: boolean;
  addressSearchError: string | null;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onAddressKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  addressLocation: { lat: number; lng: number } | null;
  lastSearchedAddress: string;
  recentAddresses: string[];
  onRecentClick: (recent: string) => void;
  onClearAddressSearch: () => void;
  onRestoreLastAddress: () => void;
  /** Autocomplete dropdown rendered by the parent (closes over geocode state). */
  searchDropdown: ReactNode;
  /** id of the highlighted autocomplete option (aria-activedescendant). */
  searchActiveDescendant?: string;
  /** Count of shops near the searched address ("נמצאו N מקומות"). */
  nearbyCount: number;

  favoritesFilter: boolean;
  sellsBeansFilter: boolean;
  noMatchaFilter: boolean;
  onlineOnlyFilter: boolean;
  openShabbatFilter: boolean;
  showOpenNowOnly: boolean;
  selectedBrewMethods: string[];
  favoritesCount: number;
  onToggleFavoritesFilter: () => void;
  onToggleSellsBeansFilter: () => void;
  onToggleNoMatchaFilter: () => void;
  onToggleOnlineOnlyFilter: () => void;
  onToggleOpenShabbatFilter: () => void;
  onToggleOpenNowFilter: () => void;
  onToggleBrewMethod: (method: string) => void;

  onSuggestMissingPlace: () => void;
}

/**
 * The app's left (RTL: right) sidebar: logo/header, address search with
 * autocomplete and recents, view navigation (map/shops/about), filters
 * (favorites, sells-beans, no-matcha, online-only, brew methods) and the
 * favorites footer. Includes the mobile menu button and backdrop overlay.
 * Stateless — all state and handlers come from the parent.
 */
export function Sidebar({
  sidebarOpen,
  sidebarCollapsed,
  isMobile,
  prefersReducedMotion,
  onToggleOpen,
  onCloseSidebar,
  onToggleCollapsed,
  menuButtonHidden = false,
  activeView,
  onNavigate,
  addressQuery,
  onAddressQueryChange,
  isGeocoding,
  addressSearchError,
  onSearchFocus,
  onSearchBlur,
  onAddressKeyDown,
  addressLocation,
  lastSearchedAddress,
  recentAddresses,
  onRecentClick,
  onClearAddressSearch,
  onRestoreLastAddress,
  searchDropdown,
  searchActiveDescendant,
  nearbyCount,
  favoritesFilter,
  sellsBeansFilter,
  noMatchaFilter,
  onlineOnlyFilter,
  openShabbatFilter,
  showOpenNowOnly,
  selectedBrewMethods,
  favoritesCount,
  onToggleFavoritesFilter,
  onToggleSellsBeansFilter,
  onToggleNoMatchaFilter,
  onToggleOnlineOnlyFilter,
  onToggleOpenShabbatFilter,
  onToggleOpenNowFilter,
  onToggleBrewMethod,
  onSuggestMissingPlace,
}: SidebarProps) {
  // Focus management for the mobile drawer: move focus in when it opens,
  // restore it when it closes (mirrors DetailPanel's behavior).
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!isMobile) return;
    if (sidebarOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      drawerRef.current?.focus();
    } else if (previouslyFocused.current) {
      previouslyFocused.current.focus?.();
      previouslyFocused.current = null;
    }
  }, [isMobile, sidebarOpen]);

  const mainFilters = [
    {
      onClick: onToggleOpenNowFilter,
      active: showOpenNowOnly,
      activeClass: 'bg-green-600 text-white shadow-md',
      icon: <Icon name="Clock" className="h-3.5 w-3.5 shrink-0" />,
      label: 'פתוח עכשיו',
      badge: null,
    },
    {
      onClick: onToggleSellsBeansFilter,
      active: sellsBeansFilter,
      activeClass: `bg-brand text-white shadow-md`,
      icon: <Icon name="Package" className="h-3.5 w-3.5 shrink-0" />,
      label: 'מוכרים פולים',
      badge: null,
    },
    {
      onClick: onToggleNoMatchaFilter,
      active: noMatchaFilter,
      activeClass: 'bg-emerald-600 text-white shadow-md',
      icon: <span className="text-sm leading-none shrink-0">🍃</span>,
      label: "ללא מאצ'ה",
      badge: null,
    },
    {
      onClick: onToggleOnlineOnlyFilter,
      active: onlineOnlyFilter,
      activeClass: 'bg-purple-600 text-white shadow-md',
      icon: <span className="text-sm leading-none shrink-0">📦</span>,
      label: 'חנות אינטרנטית',
      badge: null,
    },
    {
      onClick: onToggleOpenShabbatFilter,
      active: openShabbatFilter,
      activeClass: 'bg-amber-600 text-white shadow-md',
      icon: <span className="text-sm leading-none shrink-0">🕯️</span>,
      label: 'פתוח בשבת',
      badge: null,
    },
    {
      onClick: onToggleFavoritesFilter,
      active: favoritesFilter,
      activeClass: `bg-brand text-white shadow-md`,
      icon: <Icon name="Heart" className={`h-3.5 w-3.5 shrink-0 ${favoritesFilter ? 'fill-white' : ''}`} />,
      label: 'מועדפים',
      badge: favoritesCount > 0 ? favoritesCount : null,
    },
  ];

  return (
    <>
      {/* Mobile Menu Button — hidden while a fullscreen overlay is open so it
          doesn't overlap that overlay's controls (e.g. the detail panel's X). */}
      <LiquidButton
        onClick={onToggleOpen}
        size="icon"
        aria-label={sidebarOpen ? "סגור תפריט" : "פתח תפריט"}
        aria-expanded={sidebarOpen}
        // `inert` (not aria-hidden) — it removes the button from the tab order
        // too; aria-hidden on a focusable element is a WCAG 4.1.2 violation.
        inert={menuButtonHidden || undefined}
        className={`fixed right-6 top-4 z-[10000] rounded-lg p-3 lg:hidden ${
          menuButtonHidden ? "pointer-events-none opacity-0" : ""
        }`}
      >
        {sidebarOpen ? (
          <Icon name="X" className="h-5 w-5 text-foreground" />
        ) : (
          <Icon name="Menu" className="h-5 w-5 text-foreground" />
        )}
      </LiquidButton>

      {/* Mobile Overlay - Semi-transparent backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out lg:hidden ${
          sidebarOpen
            ? "opacity-100 visible pointer-events-auto"
            : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={onCloseSidebar}
        aria-hidden={!sidebarOpen}
      />

      {/* Sidebar - Always rendered, uses CSS classes for show/hide, floats above map */}
      <motion.div
        ref={drawerRef}
        tabIndex={-1}
        role={isMobile ? "dialog" : undefined}
        aria-modal={isMobile ? true : undefined}
        aria-label="תפריט וסינון"
        // While transformed off-screen on mobile the drawer is only visually
        // hidden — `inert` keeps its ~15 controls out of the tab order and
        // away from assistive tech.
        inert={isMobile && !sidebarOpen ? true : undefined}
        className={`fixed right-0 top-0 z-[9999] h-dvh ${
          sidebarCollapsed ? "w-10" : "w-80"
        } ${sidebarCollapsed ? "bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md" : "bg-white/90 dark:bg-[#0B1120]/90"}`}
        initial={false}
        animate={{ x: isMobile && !sidebarOpen ? "100%" : "0%" }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 360, damping: 34, mass: 0.9 }
        }
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100dvh",
          boxShadow: sidebarCollapsed ? "0 0 10px rgba(0, 0, 0, 0.1)" : "0 0 20px rgba(0, 0, 0, 0.3)",
        }}
      >
        {sidebarCollapsed ? (
          <div className="flex h-full w-full flex-col border-l border-white/30 dark:border-slate-700/30">
            {/* Minimal collapsed header */}
            <div className="flex items-center justify-center p-2 pt-4 pb-2">
              <LiquidButton
                onClick={onToggleCollapsed}
                size="icon"
                aria-label="הרחב תפריט"
                className="hidden md:flex rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <Icon name="ChevronLeft" className="h-4 w-4 text-muted-foreground" />
              </LiquidButton>
            </div>
            {/* Minimal navigation */}
            <nav aria-label="ניווט" className="flex-1 flex flex-col items-center gap-3 pt-2 px-1">
              <LiquidButton
                type="button"
                aria-label="מפה"
                aria-current={activeView === "map" ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigate("map");
                }}
                className={`flex items-center justify-center w-9 h-9 p-0 rounded-lg transition-colors duration-200 ${
                  activeView === "map"
                    ? "bg-black/5 dark:bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                }`}
              >
                <Icon name="MapPin" className="h-4 w-4" />
              </LiquidButton>

              <LiquidButton
                type="button"
                aria-label="רשימת מקומות"
                aria-current={activeView === "shops" ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigate("shops");
                }}
                className={`flex items-center justify-center w-9 h-9 p-0 rounded-lg transition-colors duration-200 ${
                  activeView === "shops"
                    ? "bg-black/5 dark:bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                }`}
              >
                <Icon name="Coffee" className="h-4 w-4" />
              </LiquidButton>

              {/* About button pinned to bottom */}
              <LiquidButton
                type="button"
                aria-label="עליי"
                aria-current={activeView === "about" ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigate("about");
                }}
                title="עליי"
                className={`mt-auto flex items-center justify-center w-9 h-9 p-0 rounded-lg transition-colors duration-200 ${
                  activeView === "about"
                    ? "bg-black/5 dark:bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
                }`}
              >
                <Icon name="User" className="h-4 w-4" />
              </LiquidButton>
            </nav>
          </div>
        ) : (
          <div className="flex h-full flex-col bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-xl border-s border-black/5 dark:border-white/10">
            <div className="flex h-full w-full flex-col">
        {/* Header — a soft scroll-edge fade under the chrome instead of a hard
            1px rule, so content dissolves under it rather than hitting a line
            (Apple §12: scroll edge effects, not dividers). */}
        <div className="sidebar-header relative z-10 flex items-center justify-between p-5 pr-16 md:pr-5 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-gradient-to-b after:from-black/[0.06] after:to-transparent dark:after:from-white/[0.07]">
          <div className="flex items-center">
            <Image
              src="/images/ca_fe_logo.png"
              alt="Ca Fe Logo"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              priority
            />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LiquidButton
              onClick={onToggleCollapsed}
              size="icon"
              aria-label="כווץ תפריט"
              className="hidden md:flex rounded-xl p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <Icon name="ChevronRight" className="h-4 w-4 text-muted-foreground" />
            </LiquidButton>
          </div>
        </div>


        {/* Address Search */}
        {!sidebarCollapsed && (
          <div className="px-3 md:px-4 py-2 md:py-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Icon name="MapPin" className="pointer-events-none absolute right-2 md:right-3 top-1/2 h-3.5 md:h-4 w-3.5 md:w-4 -translate-y-1/2 text-muted-foreground" />
                {isGeocoding && (
                  <div className="absolute right-8 md:right-10 top-1/2 -translate-y-1/2">
                    <div className="skeleton h-3 w-3 rounded-full" />
                  </div>
                )}
                <input
                  type="text"
                  role="combobox"
                  aria-label="חיפוש בית קפה או כתובת"
                  aria-autocomplete="list"
                  aria-expanded={searchDropdown != null}
                  aria-controls={searchDropdown != null ? "cafe-search-listbox" : undefined}
                  aria-activedescendant={searchActiveDescendant}
                  placeholder="חפש בית קפה או כתובת..."
                  value={addressQuery}
                  onChange={(event) => onAddressQueryChange(event.target.value)}
                  onFocus={onSearchFocus}
                  onBlur={onSearchBlur}
                  onKeyDown={onAddressKeyDown}
                  className="w-full rounded-lg border-0 bg-black/5 dark:bg-white/10 py-1.5 md:py-2 pr-8 md:pr-10 pl-3 md:pl-4 text-base md:text-sm text-foreground placeholder:text-muted-foreground outline-none ring-brand/40 transition-all duration-200 focus:ring-2"
                />
                {(addressQuery.trim() || addressLocation) && (
                  <button
                    type="button"
                    onClick={onClearAddressSearch}
                    aria-label="נקה חיפוש"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground after:absolute after:-inset-3 after:content-['']"
                    title="נקה חיפוש"
                  >
                    <Icon name="X" className="h-3.5 w-3.5" />
                  </button>
                )}
                {searchDropdown}
              </div>
            </div>
            {addressSearchError && (
              <div role="alert" className="mt-2 text-xs text-red-600 dark:text-red-300" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
                {addressSearchError}
              </div>
            )}
            {!addressQuery.trim() && recentAddresses.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recentAddresses.slice(0, 4).map((recent) => (
                  <button
                    key={recent}
                    type="button"
                    onClick={() => onRecentClick(recent)}
                    className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                    style={{ fontFamily: 'var(--font-aran), sans-serif' }}
                  >
                    {recent}
                  </button>
                ))}
              </div>
            )}
            {addressLocation && !addressQuery.trim() && lastSearchedAddress.trim() && (
              <button
                type="button"
                onClick={onRestoreLastAddress}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
              >
                כתובת שגויה?
              </button>
            )}
            {addressLocation && (
              <div role="status" aria-live="polite" className="mt-2 text-xs text-muted-foreground">
                נמצאו {nearbyCount} מקומות בסביבה
              </div>
            )}
          </div>
        )}

        {/* Navigation and Search Results */}
        <nav aria-label="ניווט וסינון" className="flex-1 overflow-y-auto px-2 md:px-3 py-2">
          <div className="space-y-1">
                <LiquidButton
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onNavigate("map");
                    }}
                    className={`flex items-center transition-colors duration-200 relative z-20 w-full gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                      activeView === "map"
                        ? "bg-black/5 dark:bg-white/10 font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon name="MapPin" className="h-5 w-5" />
                    <span>מפה</span>
                  </LiquidButton>

                <LiquidButton
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNavigate("shops");
                  }}
                  className={`flex items-center transition-colors duration-200 relative z-20 w-full gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    activeView === "shops"
                      ? "bg-black/5 dark:bg-white/10 font-semibold text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon name="Coffee" className="h-5 w-5" />
                  <span>רשימת מקומות</span>
                </LiquidButton>
              </div>

              {/* Add Missing Place Button */}
              <div className="mt-3 px-3">
                <LiquidButton
                  type="button"
                  onClick={onSuggestMissingPlace}
                  size="sm"
                  className="w-full items-center justify-center gap-2 bg-brand px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-strong rounded-xl"
                >
                  <Icon name="Plus" className="h-3.5 w-3.5" />
                  <span>הוספת מקום חסר</span>
                </LiquidButton>
              </div>

              <div className="mt-6 mb-3 px-3">
                <h3 className="text-base font-semibold text-foreground">
                  מסננים
                </h3>
              </div>

              <div className="space-y-2 px-3">
                {/* ── Main filters — all full-width, icon after the label (RTL: left of the word) ── */}
                {mainFilters.map(({ onClick, active, activeClass, icon, label, badge }) => (
                  <FilterChip
                    key={label}
                    onClick={onClick}
                    active={active}
                    activeClass={activeClass}
                    icon={icon}
                    label={label}
                    badge={badge}
                    className="w-full"
                  />
                ))}

                {/* ── Brew methods — equal-width chips in a row ── */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
                  <p className="mb-2 text-xs text-muted-foreground">שיטת הכנה</p>
                  <div className="flex gap-2">
                    {BREW_METHODS.map((method) => (
                      <FilterChip
                        key={method}
                        onClick={() => onToggleBrewMethod(method)}
                        active={selectedBrewMethods.includes(method)}
                        label={method}
                        className="flex-1 px-2"
                      />
                    ))}
                  </div>
                </div>
              </div>
        </nav>

          {/* About button — above Favorites */}
          <div className="border-t border-black/5 dark:border-white/10 p-3">
            <LiquidButton
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNavigate("about");
              }}
              className={`flex items-center transition-colors duration-200 relative z-20 w-full gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                activeView === "about"
                  ? "bg-black/5 dark:bg-white/10 font-semibold text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Icon name="User" className="h-5 w-5" />
              <span>עליי</span>
            </LiquidButton>
          </div>

          {/* Favorites Section */}
          <div className="border-t border-black/5 dark:border-white/10 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                מועדפים
              </span>
              <span className="text-xs text-muted-foreground">
                {favoritesCount} שמורים
              </span>
            </div>
          </div>

          </div>
        </div>
        )}
      </motion.div>
    </>
  );
}
