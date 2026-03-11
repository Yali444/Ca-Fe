"use client";

import React from "react";
import { motion } from "framer-motion";
import { EmojiImage } from "@/components/ui/EmojiImage";

// Animation variants for continuous floating
const floatingVariants = {
  initial: { y: "-10vh", x: 0, rotate: 0 },
  animate: { y: "110vh", x: 0, rotate: 360 },
};

// Create staggered delays so emojis are always visible
const createStaggeredElements = () => {
  const baseElements = [
    { emoji: "☕", baseDuration: 32, size: 22 },
    { emoji: "🥐", baseDuration: 30, size: 20 },
    { emoji: "🥖", baseDuration: 34, size: 25 },
    { emoji: "✨", baseDuration: 31, size: 21 },
    { emoji: "💫", baseDuration: 33, size: 24 },
    { emoji: "🌟", baseDuration: 35, size: 22 },
    { emoji: "🍪", baseDuration: 31, size: 20 },
    { emoji: "🥐", baseDuration: 33, size: 22 },
    { emoji: "🧁", baseDuration: 30, size: 21 },
    { emoji: "✨", baseDuration: 32, size: 25 },
  ];

  // Create multiple instances with staggered delays and random positions
  const staggeredElements: any[] = [];
  baseElements.forEach((base, index) => {
    // Generate random positions for each instance
    const positions = [
      Math.random() * 100, // Random left position 0-100%
      Math.random() * 100, // Random left position 0-100%
      Math.random() * 100, // Random left position 0-100%
    ];
    
    // Add 3 instances with different delays and random positions
    staggeredElements.push({
      ...base,
      id: `${index}-0`,
      left: positions[0],
      duration: base.baseDuration + Math.random() * 4 - 2, // ±2 seconds variation
      delay: Math.random() * 5, // Random delay 0-5 seconds
    });
    staggeredElements.push({
      ...base,
      id: `${index}-1`,
      left: positions[1],
      duration: base.baseDuration + Math.random() * 4 - 2, // ±2 seconds variation
      delay: Math.random() * 5 + 10, // Random delay 10-15 seconds
    });
    staggeredElements.push({
      ...base,
      id: `${index}-2`,
      left: positions[2],
      duration: base.baseDuration + Math.random() * 4 - 2, // ±2 seconds variation
      delay: Math.random() * 5 + 20, // Random delay 20-25 seconds
    });
  });

  return staggeredElements;
};

const STABLE_FLOATING_ELEMENTS = createStaggeredElements();

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
          variants={floatingVariants}
          initial="initial"
          animate="animate"
          transition={{
            duration: element.duration,
            repeat: Infinity,
            delay: element.delay,
            ease: "linear",
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








