import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

import { AuroraBackground } from "@/components/ui/aurora-background";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { blueColors } from "@/components/map/colors";
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
  const mainFilters = [
    {
      onClick: onToggleOpenNowFilter,
      active: showOpenNowOnly,
      activeClass: 'bg-green-500 text-white shadow-md',
      icon: <Icon name="Clock" className="h-3.5 w-3.5 shrink-0" />,
      label: 'פתוח עכשיו',
      badge: null,
    },
    {
      onClick: onToggleFavoritesFilter,
      active: favoritesFilter,
      activeClass: `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md`,
      icon: <Icon name="Heart" className={`h-3.5 w-3.5 shrink-0 ${favoritesFilter ? 'fill-white' : ''}`} />,
      label: 'מועדפים',
      badge: favoritesCount > 0 ? favoritesCount : null,
    },
    {
      onClick: onToggleSellsBeansFilter,
      active: sellsBeansFilter,
      activeClass: `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md`,
      icon: <Icon name="Package" className="h-3.5 w-3.5 shrink-0" />,
      label: 'מוכרים פולים',
      badge: null,
    },
    {
      onClick: onToggleNoMatchaFilter,
      active: noMatchaFilter,
      activeClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md',
      icon: <span className="text-sm leading-none shrink-0">🍃</span>,
      label: "ללא מאצ'ה",
      badge: null,
    },
    {
      onClick: onToggleOnlineOnlyFilter,
      active: onlineOnlyFilter,
      activeClass: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md',
      icon: <span className="text-sm leading-none shrink-0">📦</span>,
      label: 'חנות אינטרנטית',
      badge: null,
    },
    {
      onClick: onToggleOpenShabbatFilter,
      active: openShabbatFilter,
      activeClass: 'bg-amber-500 text-white shadow-md',
      icon: <span className="text-sm leading-none shrink-0">🕯️</span>,
      label: 'פתוח בשבת',
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Menu Button — hidden while a fullscreen overlay is open so it
          doesn't overlap that overlay's controls (e.g. the detail panel's X). */}
      <LiquidButton
        onClick={onToggleOpen}
        size="icon"
        aria-hidden={menuButtonHidden}
        className={`fixed right-6 top-4 z-[10000] rounded-lg p-3 md:hidden ${
          menuButtonHidden ? "pointer-events-none opacity-0" : ""
        }`}
      >
        {sidebarOpen ? (
          <Icon name="X" className="h-5 w-5 text-[#0284C7]" />
        ) : (
          <Icon name="Menu" className="h-5 w-5 text-[#0284C7]" />
        )}
      </LiquidButton>

      {/* Mobile Overlay - Semi-transparent backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out md:hidden ${
          sidebarOpen
            ? "opacity-100 visible pointer-events-auto"
            : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={onCloseSidebar}
        aria-hidden={!sidebarOpen}
      />

      {/* Sidebar - Always rendered, uses CSS classes for show/hide, floats above map */}
      <motion.div
        className={`fixed right-0 top-0 z-[9999] h-screen ${
          sidebarCollapsed ? "w-10" : "w-80"
        } ${sidebarCollapsed ? "bg-gradient-to-b from-white/95 via-white/90 to-white/95 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-slate-900/95 backdrop-blur-md" : "bg-zinc-50 dark:bg-[#1a1a1a]"}`}
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
          height: "100vh",
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
                className="hidden md:flex rounded-lg p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"
              >
                <Icon name="ChevronLeft" className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </LiquidButton>
            </div>
            {/* Minimal navigation */}
            <nav className="flex-1 flex flex-col items-center gap-3 pt-2 px-1">
              <LiquidButton
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigate("map");
                }}
                className={`flex items-center justify-center w-9 h-9 p-0 rounded-lg transition-all duration-200 ${
                  activeView === "map"
                    ? "opacity-100 text-[#0C4A6E] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 shadow-sm"
                    : "opacity-70 text-slate-500 dark:text-slate-400 hover:opacity-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon name="MapPin" className="h-4 w-4" />
              </LiquidButton>

              <LiquidButton
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigate("shops");
                }}
                className={`flex items-center justify-center w-9 h-9 p-0 rounded-lg transition-all duration-200 ${
                  activeView === "shops"
                    ? "opacity-100 text-[#0C4A6E] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 shadow-sm"
                    : "opacity-70 text-slate-500 dark:text-slate-400 hover:opacity-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon name="Coffee" className="h-4 w-4" />
              </LiquidButton>

              {/* About button pinned to bottom */}
              <LiquidButton
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigate("about");
                }}
                title="עליי"
                className={`mt-auto flex items-center justify-center w-9 h-9 p-0 rounded-lg transition-all duration-200 ${
                  activeView === "about"
                    ? "opacity-100 text-[#0C4A6E] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 shadow-sm"
                    : "opacity-70 text-slate-500 dark:text-slate-400 hover:opacity-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <Icon name="User" className="h-4 w-4" />
              </LiquidButton>
            </nav>
          </div>
        ) : (
          <AuroraBackground
            className="flex h-full flex-col bg-zinc-50 dark:bg-[#1a1a1a]"
            showRadialGradient={false}
          >
            <div className="flex h-full w-full flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between border-b p-5 pr-16 md:pr-5 backdrop-blur-xl bg-white/70 dark:bg-zinc-900/70"
          style={{
            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          <div className="flex items-center">
            <Image
              src="/images/ca_fe_logo.png"
              alt="Ca Fe Logo"
              width={120}
              height={48}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LiquidButton
              onClick={onToggleCollapsed}
              size="icon"
              className="hidden md:flex dark:bg-slate-800/80 dark:border dark:border-white/20 rounded-xl p-1.5"
            >
              <Icon name="ChevronRight" className="h-4 w-4 text-[#64748B] dark:text-white" />
            </LiquidButton>
          </div>
        </div>


        {/* Address Search */}
        {!sidebarCollapsed && (
          <div className="px-3 md:px-4 py-2 md:py-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Icon name="MapPin" className="pointer-events-none absolute right-2 md:right-3 top-1/2 h-3.5 md:h-4 w-3.5 md:w-4 -translate-y-1/2 text-[#075985] dark:text-slate-400" />
                {isGeocoding && (
                  <div className="absolute right-8 md:right-10 top-1/2 -translate-y-1/2">
                    <div className="skeleton h-3 w-3 rounded-full" />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="חפש בית קפה או כתובת..."
                  value={addressQuery}
                  onChange={(event) => onAddressQueryChange(event.target.value)}
                  onFocus={onSearchFocus}
                  onBlur={onSearchBlur}
                  onKeyDown={onAddressKeyDown}
                  className="w-full rounded-md border border-[#BAE6FD] dark:border-slate-700 bg-[#E0F2FE] dark:bg-slate-800 py-1.5 md:py-2 pr-8 md:pr-10 pl-3 md:pl-4 text-base md:text-sm text-[#0C4A6E] dark:text-slate-200 placeholder:text-[#075985] dark:placeholder:text-slate-500 outline-none ring-[#38BDF8]/40 dark:ring-blue-400/40 transition-all duration-200 focus:border-transparent focus:ring-2"
                />
                {(addressQuery.trim() || addressLocation) && (
                  <button
                    type="button"
                    onClick={onClearAddressSearch}
                    aria-label="נקה חיפוש"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#64748B] hover:text-[#0C4A6E] dark:text-slate-400 dark:hover:text-slate-200"
                    title="נקה חיפוש"
                  >
                    <Icon name="X" className="h-3.5 w-3.5" />
                  </button>
                )}
                {searchDropdown}
              </div>
            </div>
            {addressSearchError && (
              <div className="mt-2 text-[10px] md:text-xs text-red-600 dark:text-red-300" style={{ fontFamily: 'var(--font-aran), sans-serif' }}>
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
                    className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
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
                className="mt-2 text-[10px] md:text-xs text-[#64748B] hover:text-[#0C4A6E] dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                style={{ fontFamily: 'var(--font-aran), sans-serif' }}
              >
                כתובת שגויה?
              </button>
            )}
            {addressLocation && (
              <div className="mt-2 text-[10px] md:text-xs text-[#075985] dark:text-blue-300">
                נמצאו {nearbyCount} מקומות בסביבה
              </div>
            )}
          </div>
        )}

        {/* Navigation and Search Results */}
        <nav className="flex-1 overflow-y-auto px-2 md:px-3 py-2">
          <div className="space-y-1">
                <LiquidButton
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onNavigate("map");
                    }}
                    className={`flex items-center transition-all duration-200 relative z-20 dark:bg-slate-800/80 dark:border dark:border-white/20 w-full gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                      activeView === "map"
                        ? "opacity-100 text-[#0C4A6E] dark:text-white"
                        : "opacity-70 text-[#64748B] dark:text-slate-50"
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
                  className={`flex items-center transition-all duration-200 relative z-20 dark:bg-slate-800/80 dark:border dark:border-white/20 w-full gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    activeView === "shops"
                      ? "opacity-100 text-[#0C4A6E] dark:text-white"
                      : "opacity-70 text-[#64748B] dark:text-slate-50"
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
                  className="w-full items-center justify-center gap-2 bg-[#0071E3] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#0062c4] rounded-xl"
                >
                  <Icon name="Plus" className="h-3.5 w-3.5" />
                  <span>הוספת מקום חסר</span>
                </LiquidButton>
              </div>

              <div className="mt-6 mb-3 px-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-slate-100">
                  מסננים
                </h3>
              </div>

              <div className="space-y-2 px-3">
                {/* ── Main filters — all full-width, icon after the label (RTL: left of the word) ── */}
                {mainFilters.map(({ onClick, active, activeClass, icon, label, badge }) => (
                  <LiquidButton
                    key={label}
                    type="button"
                    onClick={onClick}
                    size="sm"
                    className={`w-full flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 dark:border dark:border-white/20 ${
                      active ? activeClass : 'text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80'
                    }`}
                  >
                    <span>{label}</span>
                    {icon}
                    {badge !== null && (
                      <span className="mr-auto rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                        {badge}
                      </span>
                    )}
                  </LiquidButton>
                ))}

                {/* ── Brew methods — equal-width chips in a row ── */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
                  <p className="mb-2 text-xs text-[#64748B] dark:text-slate-400">שיטת הכנה</p>
                  <div className="flex gap-2">
                    {BREW_METHODS.map((method) => (
                      <LiquidButton
                        key={method}
                        type="button"
                        onClick={() => onToggleBrewMethod(method)}
                        size="sm"
                        className={`flex-1 rounded-full px-2 py-2 text-xs font-medium text-center transition-all duration-200 dark:border dark:border-white/20 ${
                          selectedBrewMethods.includes(method)
                            ? `bg-gradient-to-r ${blueColors.primary.gradient} ${blueColors.primary.gradientDark} text-white shadow-md`
                            : 'text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80'
                        }`}
                      >
                        {method}
                      </LiquidButton>
                    ))}
                  </div>
                </div>
              </div>
        </nav>

          {/* About button — above Favorites */}
          <div className="border-t border-[#BAE6FD] dark:border-slate-800 p-3">
            <LiquidButton
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNavigate("about");
              }}
              className={`flex items-center transition-all duration-200 relative z-20 w-full gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                activeView === "about"
                  ? "opacity-100 text-[#0C4A6E] dark:text-white dark:bg-slate-800/80 dark:border dark:border-white/20"
                  : "opacity-70 text-[#64748B] dark:text-slate-50 dark:bg-slate-800/80 dark:border dark:border-white/20"
              }`}
            >
              <Icon name="User" className="h-5 w-5" />
              <span>עליי</span>
            </LiquidButton>
          </div>

          {/* Favorites Section */}
          <div className="bg-[#E0F2FE] dark:bg-slate-900 border-t border-[#BAE6FD] dark:border-slate-800 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[#0C4A6E] dark:text-slate-200">
                מועדפים
              </span>
              <span className="text-xs text-[#64748B] dark:text-slate-400">
                {favoritesCount} שמורים
              </span>
            </div>
          </div>

          </div>
        </AuroraBackground>
        )}
      </motion.div>
    </>
  );
}
