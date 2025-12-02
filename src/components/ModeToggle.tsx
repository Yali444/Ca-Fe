"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Coffee, Leaf } from 'lucide-react';
import { useMode } from '@/contexts/ModeContext';

const ModeToggle: React.FC = () => {
  const { mode, toggleMode } = useMode();

  return (
    <button
      onClick={toggleMode}
      className={`
        relative flex items-center gap-2 px-4 py-2 rounded-full
        transition-all duration-300
        ${mode === 'coffee' 
          ? 'bg-blue-50 border-2 border-blue-200' 
          : 'bg-emerald-50 border-2 border-emerald-200'
        }
        hover:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${mode === 'coffee' ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'}
      `}
      aria-label={`Switch to ${mode === 'coffee' ? 'matcha' : 'coffee'} mode`}
    >
      {/* Background circle that slides */}
      <motion.div
        className={`
          absolute left-1 top-1 bottom-1 w-10 h-10 rounded-full
          ${mode === 'coffee' 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
            : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
          }
          shadow-md
        `}
        layout
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
      />

      {/* Icons container */}
      <div className="relative z-10 flex items-center gap-3">
        <motion.div
          className="flex items-center justify-center w-10 h-10"
          animate={{
            opacity: mode === 'coffee' ? 1 : 0.4,
            scale: mode === 'coffee' ? 1 : 0.9
          }}
          transition={{ duration: 0.2 }}
        >
          <Coffee 
            className={`w-5 h-5 ${mode === 'coffee' ? 'text-white' : 'text-blue-600'}`}
          />
        </motion.div>

        <motion.div
          className="flex items-center justify-center w-10 h-10"
          animate={{
            opacity: mode === 'matcha' ? 1 : 0.4,
            scale: mode === 'matcha' ? 1 : 0.9
          }}
          transition={{ duration: 0.2 }}
        >
          <Leaf 
            className={`w-5 h-5 ${mode === 'matcha' ? 'text-white' : 'text-emerald-600'}`}
          />
        </motion.div>
      </div>
    </button>
  );
};

export default ModeToggle;


