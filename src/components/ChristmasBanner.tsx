"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Pre-generated stable star positions
const STABLE_STARS = [
  { id: 0, left: 5, top: 20, opacity: 0.5, duration: 2.5, delay: 0 },
  { id: 1, left: 12, top: 60, opacity: 0.7, duration: 3, delay: 0.5 },
  { id: 2, left: 20, top: 35, opacity: 0.4, duration: 2.8, delay: 1 },
  { id: 3, left: 28, top: 75, opacity: 0.6, duration: 3.2, delay: 1.5 },
  { id: 4, left: 35, top: 15, opacity: 0.5, duration: 2.6, delay: 0.3 },
  { id: 5, left: 42, top: 50, opacity: 0.8, duration: 3.5, delay: 0.8 },
  { id: 6, left: 50, top: 80, opacity: 0.4, duration: 2.4, delay: 1.2 },
  { id: 7, left: 58, top: 25, opacity: 0.6, duration: 3.1, delay: 0.6 },
  { id: 8, left: 65, top: 65, opacity: 0.5, duration: 2.9, delay: 1.8 },
  { id: 9, left: 72, top: 40, opacity: 0.7, duration: 3.3, delay: 0.2 },
  { id: 10, left: 78, top: 10, opacity: 0.4, duration: 2.7, delay: 1.4 },
  { id: 11, left: 85, top: 55, opacity: 0.6, duration: 3.4, delay: 0.9 },
  { id: 12, left: 92, top: 30, opacity: 0.5, duration: 2.5, delay: 1.6 },
  { id: 13, left: 8, top: 85, opacity: 0.7, duration: 3.0, delay: 0.4 },
  { id: 14, left: 45, top: 5, opacity: 0.4, duration: 2.8, delay: 1.1 },
];

export function ChristmasBanner() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative overflow-hidden rounded-2xl mx-2 mb-3 shadow-lg"
        style={{
          background: "linear-gradient(135deg, #dc2626 0%, #991b1b 50%, #7f1d1d 100%)",
        }}
      >
        {/* Stars background */}
        <div className="absolute inset-0 overflow-hidden">
          {STABLE_STARS.map((star) => (
            <motion.div
              key={star.id}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
              }}
              animate={{
                opacity: [0.3, star.opacity, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: star.duration,
                repeat: Infinity,
                delay: star.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Gold border accent */}
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: "2px solid transparent",
            background: "linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,215,0,0.1), rgba(255,215,0,0.3)) border-box",
            WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        <div className="relative z-10 px-4 py-3 flex items-center gap-4">
          {/* Christmas Tree */}
          <div className="flex-shrink-0 text-2xl">
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              🎄
            </motion.div>
          </div>

          {/* Text content */}
          <div className="flex-1 text-center min-w-0">
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200"
              style={{ 
                textShadow: "0 0 20px rgba(255, 215, 0, 0.3)",
              }}
            >
              Merry Christmas! 🎅
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-white/90"
            >
              Celebrate with special coffee! ☕
            </motion.p>
          </div>

          {/* Decorative elements */}
          <div className="flex-shrink-0 flex gap-1">
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="text-sm opacity-80"
            >
              ❄️
            </motion.span>
            <motion.span
              animate={{ rotate: [360, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="text-sm opacity-80"
            >
              ⭐
            </motion.span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
