import type { AppMode } from "@/types/place";

export interface ModeColors {
  primary: {
    text: string;
    textLight: string;
    gradient: string;
    gradientDark: string;
    shadow: string;
    hoverShadow: string;
  };
}

export function getModeColors(mode: AppMode): ModeColors {
  if (mode === "matcha") {
    return {
      primary: {
        text: "text-emerald-700 dark:text-emerald-400",
        textLight: "text-emerald-800 dark:text-emerald-300",
        gradient: "from-emerald-600 to-emerald-700",
        gradientDark: "dark:from-emerald-500 dark:to-emerald-600",
        shadow: "shadow-emerald-500/30",
        hoverShadow: "hover:shadow-emerald-500/40",
      },
    };
  }

  // Default: coffee mode (blue)
  return {
    primary: {
      text: "text-[#075985] dark:text-blue-300",
      textLight: "text-[#0C4A6E] dark:text-blue-200",
      gradient: "from-[#38BDF8] to-[#0EA5E9]",
      gradientDark: "dark:from-[#38BDF8] dark:to-[#0EA5E9]",
      shadow: "shadow-[#38BDF8]/30",
      hoverShadow: "hover:shadow-[#38BDF8]/40",
    },
  };
}


