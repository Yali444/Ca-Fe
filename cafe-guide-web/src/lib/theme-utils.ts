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
        text: "text-[#0071E3] dark:text-blue-300",
        textLight: "text-[#0071E3] dark:text-blue-200",
        gradient: "from-[#0071E3] to-[#005BB5]",
        gradientDark: "dark:from-[#3B9BFF] dark:to-[#0071E3]",
        shadow: "shadow-[#0071E3]/30",
        hoverShadow: "hover:shadow-[#0071E3]/40",
      },
    };
  }

  // Default: coffee mode (blue)
  return {
    primary: {
      text: "text-[#0071E3] dark:text-blue-300",
      textLight: "text-[#0071E3] dark:text-blue-200",
      gradient: "from-[#0071E3] to-[#005BB5]",
      gradientDark: "dark:from-[#3B9BFF] dark:to-[#0071E3]",
      shadow: "shadow-[#0071E3]/30",
      hoverShadow: "hover:shadow-[#0071E3]/40",
    },
  };
}


