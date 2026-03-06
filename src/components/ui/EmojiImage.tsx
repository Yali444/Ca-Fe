"use client";

import React from "react";
import Image from "next/image";

interface EmojiImageProps {
  emoji: string;
  size?: number;
  className?: string;
  alt?: string;
}

// Mapping from emoji text to PNG filenames
const emojiMap: Record<string, string> = {
  "☕": "1zpresso.png",
  "🥐": "hario_carafe.png", 
  "🍰": "v60 neo.png",
  "🥖": "Gooseneck.png",
  "🍪": "cookie.png",
  "🧁": "cupcake.png",
  "🍩": "donut.png",
  "✨": "sparkles.png",
  "💫": "dizzy.png",
  "🌟": "star.png",
};

export function EmojiImage({ emoji, size = 24, className = "", alt = "" }: EmojiImageProps) {
  const filename = emojiMap[emoji];
  
  // Fallback to text emoji if no PNG exists
  if (!filename) {
    return (
      <span 
        className={className}
        style={{ fontSize: size, display: 'inline-block', lineHeight: 1 }}
      >
        {emoji}
      </span>
    );
  }

  return (
    <div 
      className={`inline-block ${className}`}
      style={{ 
        width: size, 
        height: size, 
        position: 'relative' 
      }}
    >
      <Image
        src={`/images/emojis/${filename}`}
        alt={alt || emoji}
        fill
        style={{ objectFit: 'contain' }}
        sizes={`${size}px`}
      />
    </div>
  );
}
