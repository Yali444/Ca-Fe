"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface FloatingElement {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export function HanukkahDecorations() {
  // Generate random floating elements
  const floatingElements = useMemo<FloatingElement[]>(() => {
    const elements: FloatingElement[] = [];
    const emojis = ["✡️", "🕎", "🪔", "⭐", "✨"];
    
    for (let i = 0; i < 15; i++) {
      elements.push({
        id: i,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 15 + Math.random() * 10,
        size: 12 + Math.random() * 12,
      });
    }
    return elements;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
      {floatingElements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute opacity-20 dark:opacity-15"
          style={{
            left: `${element.left}%`,
            fontSize: `${element.size}px`,
          }}
          initial={{ y: "110vh", rotate: 0 }}
          animate={{
            y: "-10vh",
            rotate: 360,
          }}
          transition={{
            y: {
              duration: element.duration,
              repeat: Infinity,
              delay: element.delay,
              ease: "linear",
            },
            rotate: {
              duration: element.duration * 0.5,
              repeat: Infinity,
              delay: element.delay,
              ease: "linear",
            },
          }}
        >
          {element.emoji}
        </motion.div>
      ))}
      
      {/* Corner decorations */}
      <div className="absolute top-4 left-4 text-2xl opacity-30 dark:opacity-20">
        🕎
      </div>
      <div className="absolute top-4 right-16 md:right-4 text-2xl opacity-30 dark:opacity-20">
        🕎
      </div>
      
      {/* Subtle gold shimmer overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-blue-500/5"
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

// Snowflake-like candle glow particles
export function CandleGlowParticles() {
  const particles = useMemo(() => {
    return [...Array(30)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: 2 + Math.random() * 4,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.left}%`,
            width: particle.size,
            height: particle.size,
            background: "radial-gradient(circle, rgba(255,215,0,0.8) 0%, rgba(255,165,0,0.4) 50%, transparent 100%)",
            boxShadow: "0 0 6px 2px rgba(255,200,50,0.3)",
          }}
          initial={{ y: "100vh", opacity: 0 }}
          animate={{
            y: "-10vh",
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            y: {
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear",
            },
            opacity: {
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              times: [0, 0.1, 0.9, 1],
            },
          }}
        />
      ))}
    </div>
  );
}
