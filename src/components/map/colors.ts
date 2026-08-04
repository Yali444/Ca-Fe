// Pure Tailwind colour-scheme tokens for the blue (coffee) and green (matcha)
// themes. Kept deliberately free of any Leaflet import so UI components can use
// them without pulling the heavy map library into their bundle — the
// Leaflet-dependent marker factories live in ./map-icons instead.

// Derived from the --color-brand theme token in globals.css rather than
// re-hardcoding the hex, so the brand blue has a single source of truth.
// Gradients and drop-shadows were retired in the Apple-lens pass — every
// primary surface now uses the flat `bg-brand` (hover: `bg-brand-strong`)
// directly instead of reaching into this file.
export const blueColors = {
  primary: {
    text: "text-brand dark:text-blue-300",
    textLight: "text-brand dark:text-blue-200",
  },
};

export const greenColors = {
  primary: {
    text: "text-emerald-600 dark:text-emerald-300",
    textLight: "text-emerald-700 dark:text-emerald-200",
  },
};
