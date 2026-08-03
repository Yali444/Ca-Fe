// Pure Tailwind colour-scheme tokens for the blue (coffee) and green (matcha)
// themes. Kept deliberately free of any Leaflet import so UI components can use
// the gradients without pulling the heavy map library into their bundle — the
// Leaflet-dependent marker factories live in ./map-icons instead.

// Derived from the --color-brand / --color-brand-strong theme tokens in
// globals.css rather than re-hardcoding the hexes, so the brand blue has a
// single source of truth. `gradient` is deliberately only applied to the one
// primary CTA per screen — everything else uses the flat `bg-brand`.
export const blueColors = {
  primary: {
    text: "text-brand dark:text-blue-300",
    textLight: "text-brand dark:text-blue-200",
    gradient: "from-brand to-brand-strong",
    gradientDark: "dark:from-[#3B9BFF] dark:to-brand",
    shadow: "shadow-brand/30",
    hoverShadow: "hover:shadow-brand/40",
  },
};

export const greenColors = {
  primary: {
    text: "text-emerald-600 dark:text-emerald-300",
    textLight: "text-emerald-700 dark:text-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
    gradientDark: "dark:from-emerald-400 dark:to-emerald-500",
    shadow: "shadow-emerald-500/30",
    hoverShadow: "hover:shadow-emerald-500/40",
  },
};
