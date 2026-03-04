"use client";

import React from "react";
import { Coffee, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMode } from "@/contexts/ModeContext";
import { cn } from "@/lib/utils";
import { useHasMounted } from "@/hooks/useHasMounted";

export function ModeSwitch() {
  const { appMode, toggleMode } = useMode();
  const isCoffee = appMode === "coffee";
  const hasMounted = useHasMounted();
  const [showPulse, setShowPulse] = React.useState(true);

  React.useEffect(() => {
    if (hasMounted) {
      const timer = setTimeout(() => setShowPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasMounted]);

  const tooltipText = isCoffee ? "לחיצה לעבור למאצ'ה" : "לחיצה לעבור לקפה";

  return (
    <div className="relative group">
      <button
        onClick={toggleMode}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2",
          isCoffee
            ? "bg-blue-600 dark:bg-blue-700 focus:ring-blue-500 dark:focus:ring-blue-400"
            : "bg-emerald-600 dark:bg-emerald-700 focus:ring-emerald-500 dark:focus:ring-emerald-400",
          showPulse && "animate-pulse-once"
        )}
        aria-label={`Switch to ${isCoffee ? "Matcha" : "Coffee"} mode`}
        title={tooltipText}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={appMode}
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 180, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 700,
              damping: 30,
              duration: 0.2,
            }}
            className="flex items-center justify-center"
          >
            {isCoffee ? (
              <Coffee className="h-5 w-5 text-white" />
            ) : (
              <Leaf className="h-5 w-5 text-white" />
            )}
          </motion.div>
        </AnimatePresence>
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        {tooltipText}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
      </div>
    </div>
  );
}


