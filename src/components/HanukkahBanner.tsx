"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function HanukkahBanner() {
  const [currentDay, setCurrentDay] = useState(1);

  // Calculate which day of Hanukkah it is
  // Hanukkah 2025: Evening of Sun, Dec 14, 2025 – Mon, Dec 22, 2025
  useEffect(() => {
    const now = new Date();
    // First candle is lit evening of Dec 14, 2025
    // We count from Dec 14 as day 1
    const hanukkahStart = new Date(2025, 11, 14); // Dec 14, 2025 (months are 0-indexed)
    hanukkahStart.setHours(0, 0, 0, 0);
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = today.getTime() - hanukkahStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Day 1 = Dec 14, Day 2 = Dec 15, etc.
    const day = diffDays + 1;
    
    if (day >= 1 && day <= 8) {
      setCurrentDay(day);
    } else if (day < 1) {
      setCurrentDay(1); // Before Hanukkah, show 1
    } else {
      setCurrentDay(8); // After Hanukkah, show 8
    }
  }, []);

  // Generate candles based on current day
  // Menorah has 9 branches: 4 on left, shamash in middle (raised), 4 on right
  // We light from right to left (in Hebrew reading direction)
  const renderCandles = () => {
    const candles = [];
    const shamashIndex = 4; // Middle position (0-8)
    
    for (let i = 0; i < 9; i++) {
      const isShamas = i === shamashIndex;
      
      // Calculate which candle number this is (excluding shamash)
      // Candles are lit right-to-left: positions 5,6,7,8 are candles 1,2,3,4
      // Positions 3,2,1,0 are candles 5,6,7,8
      let candleNumber = 0;
      if (i > shamashIndex) {
        candleNumber = i - shamashIndex; // 5->1, 6->2, 7->3, 8->4
      } else if (i < shamashIndex) {
        candleNumber = shamashIndex - i + 4; // 3->5, 2->6, 1->7, 0->8
      }
      
      const isLit = isShamas || candleNumber <= currentDay;
      
      candles.push(
        <div
          key={i}
          className={`relative flex flex-col items-center ${isShamas ? "-mt-2" : ""}`}
        >
          {/* Flame */}
          {isLit && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: 1,
              }}
              transition={{
                scale: {
                  repeat: Infinity,
                  duration: 0.5 + Math.random() * 0.3,
                  ease: "easeInOut",
                },
                opacity: { duration: 0.3 }
              }}
              className="absolute -top-3 w-2 h-3 rounded-full bg-gradient-to-t from-yellow-500 via-orange-400 to-yellow-200"
              style={{
                boxShadow: "0 0 8px 2px rgba(255, 200, 50, 0.6), 0 0 12px 4px rgba(255, 150, 50, 0.3)",
                filter: "blur(0.5px)",
              }}
            />
          )}
          {/* Candle */}
          <div
            className={`w-1.5 rounded-t-sm ${isShamas ? "h-5" : "h-4"} ${
              isLit 
                ? "bg-gradient-to-b from-blue-300 to-blue-500" 
                : "bg-gradient-to-b from-gray-300 to-gray-400"
            }`}
          />
        </div>
      );
    }
    return candles;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative overflow-hidden rounded-2xl mx-2 mb-3 shadow-lg"
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #0c2340 50%, #1a365d 100%)",
        }}
      >
        {/* Stars background */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: 0.3 + Math.random() * 0.5,
              }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
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
          {/* Menorah */}
          <div className="flex items-end gap-0.5 flex-shrink-0">
            {renderCandles()}
          </div>

          {/* Text content */}
          <div className="flex-1 text-center min-w-0">
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200"
              style={{ 
                fontFamily: 'var(--font-aran), sans-serif',
                textShadow: "0 0 20px rgba(255, 215, 0, 0.3)",
              }}
            >
              חג חנוכה שמח! 🕎
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xs text-blue-200/80"
              style={{ fontFamily: 'var(--font-aran), sans-serif' }}
            >
              נר {currentDay} מתוך 8 • חגגו עם קפה מיוחד!
            </motion.p>
          </div>
        </div>

        {/* Decorative dreidels */}
        <motion.span
          className="absolute left-4 bottom-1 text-lg opacity-40"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          🪔
        </motion.span>
        <motion.span
          className="absolute right-12 top-1 text-sm opacity-30"
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        >
          ✡️
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}
