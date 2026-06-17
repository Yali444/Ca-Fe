// Pure Tailwind colour-scheme tokens for the blue (coffee) and green (matcha)
// themes. Kept deliberately free of any Leaflet import so UI components can use
// the gradients without pulling the heavy map library into their bundle — the
// Leaflet-dependent marker factories live in ./map-icons instead.

export const blueColors = {
  primary: {
    text: "text-[#0071E3] dark:text-blue-300",
    textLight: "text-[#0071E3] dark:text-blue-200",
    gradient: "from-[#0071E3] to-[#005BB5]",
    gradientDark: "dark:from-[#3B9BFF] dark:to-[#0071E3]",
    shadow: "shadow-[#0071E3]/30",
    hoverShadow: "hover:shadow-[#0071E3]/40",
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
