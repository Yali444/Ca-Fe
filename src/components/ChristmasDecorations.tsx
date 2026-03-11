"use client";

import React from "react";
import { motion } from "framer-motion";
import { EmojiImage } from "@/components/ui/EmojiImage";

// Pre-generated stable floating elements with wobble patterns - Mobile optimized (10 emojis)
const STABLE_FLOATING_ELEMENTS = [
  { id: 0, emoji: "☕", left: 10, delay: 0, duration: 32, size: 22, wobble: [-28, 12, 26, -8, 18, -22, 10] },
  { id: 1, emoji: "🥐", left: 20, delay: 3, duration: 30, size: 20, wobble: [20, -24, 14, 28, -16, 22, -10] },
  { id: 2, emoji: "🥖", left: 30, delay: 6, duration: 34, size: 25, wobble: [-18, 30, -10, 26, -28, 16, 24] },
  { id: 3, emoji: "✨", left: 40, delay: 1, duration: 31, size: 21, wobble: [32, -18, 12, -26, 20, -22, 14] },
  { id: 4, emoji: "💫", left: 50, delay: 4, duration: 33, size: 24, wobble: [-22, 10, -30, 18, -12, 26, -16] },
  { id: 5, emoji: "🌟", left: 60, delay: 2, duration: 35, size: 22, wobble: [-30, 22, -12, 28, -26, 18, -14] },
  { id: 6, emoji: "🍪", left: 70, delay: 3.5, duration: 31, size: 20, wobble: [-12, 20, -28, 14, -18, 26, -16] },
  { id: 7, emoji: "🥐", left: 80, delay: 6.5, duration: 33, size: 22, wobble: [22, -30, 12, -18, 28, -16, 24] },
  { id: 8, emoji: "🧁", left: 90, delay: 1.5, duration: 30, size: 21, wobble: [-26, 14, -18, 22, -12, 24, -20] },
  { id: 9, emoji: "✨", left: 95, delay: 4.5, duration: 32, size: 25, wobble: [16, -26, 22, -12, 28, -18, 20] },
];

export function CasualDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]" style={{ willChange: 'transform' }}>
      {STABLE_FLOATING_ELEMENTS.map((element) => (
        <motion.div
          key={element.id}
          className="absolute opacity-50 dark:opacity-40"
          style={{
            left: `${element.left}%`,
            fontSize: `${element.size}px`,
            willChange: 'transform',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
          }}
          initial={{ y: "-10vh", x: 0, rotate: 0 }}
          animate={{
            y: "110vh",
            x: element.wobble,
            rotate: 360,
          }}
          transition={{
            y: {
              duration: element.duration,
              repeat: Infinity,
              repeatType: "loop",
              delay: element.delay,
              ease: "linear",
            },
            x: {
              duration: element.duration * 0.9,
              repeat: Infinity,
              delay: element.delay,
              ease: "easeInOut",
              repeatType: "mirror",
            },
            rotate: {
              duration: element.duration * 1.1,
              repeat: Infinity,
              repeatType: "loop",
              delay: element.delay,
              ease: "linear",
            },
          }}
        >
          <EmojiImage emoji={element.emoji} size={element.size} />
        </motion.div>
      ))}
      
      {/* Subtle warm shimmer overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-amber-400/3 via-transparent to-orange-400/3"
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Pre-generated stable particle data with wobble
const STABLE_PARTICLES = [
  { id: 0, left: 5, delay: 0, duration: 20, size: 3, wobble: [-15, 10, -12, 8] },
  { id: 1, left: 12, delay: 2, duration: 22, size: 4, wobble: [12, -8, 15, -10] },
  { id: 2, left: 18, delay: 4, duration: 18, size: 3, wobble: [-10, 15, -8, 12] },
  { id: 3, left: 25, delay: 1, duration: 24, size: 5, wobble: [8, -12, 10, -15] },
  { id: 4, left: 32, delay: 3, duration: 19, size: 3, wobble: [-12, 8, -15, 10] },
  { id: 5, left: 38, delay: 5, duration: 21, size: 4, wobble: [15, -10, 8, -12] },
  { id: 6, left: 45, delay: 0.5, duration: 23, size: 3, wobble: [-8, 12, -10, 15] },
  { id: 7, left: 52, delay: 2.5, duration: 20, size: 5, wobble: [10, -15, 12, -8] },
  { id: 8, left: 58, delay: 4.5, duration: 18, size: 4, wobble: [-15, 8, -12, 10] },
  { id: 9, left: 65, delay: 1.5, duration: 22, size: 3, wobble: [12, -10, 15, -8] },
  { id: 10, left: 72, delay: 3.5, duration: 24, size: 4, wobble: [-8, 15, -10, 12] },
  { id: 11, left: 78, delay: 0, duration: 19, size: 5, wobble: [10, -12, 8, -15] },
  { id: 12, left: 85, delay: 2, duration: 21, size: 3, wobble: [-12, 10, -15, 8] },
  { id: 13, left: 92, delay: 4, duration: 23, size: 4, wobble: [15, -8, 12, -10] },
  { id: 14, left: 98, delay: 1, duration: 20, size: 3, wobble: [-10, 12, -8, 15] },
];

// Snowflake-like particles - slow and continuous with wobble
export function SnowParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]" style={{ willChange: 'transform' }}>
      {STABLE_PARTICLES.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size,
            background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(200,220,255,0.4) 50%, transparent 100%)",
            boxShadow: "0 0 4px 1px rgba(255,255,255,0.3)",
            willChange: 'transform',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
          }}
          initial={{ y: "100vh", x: 0, opacity: 0.4 }}
          animate={{
            y: "-10vh",
            x: particle.wobble,
            opacity: 0.4,
          }}
          transition={{
            y: {
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear",
            },
            x: {
              duration: particle.duration / 4,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
              repeatType: "mirror",
            },
          }}
        />
      ))}
    </div>
  );
}








