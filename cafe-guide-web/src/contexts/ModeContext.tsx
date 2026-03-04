// @/context/ModeContext.tsx

import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import type { Roastery } from '@/types/roastery';
import type { MatchaPlace } from '@/data/matcha';

// Define the Place type as a union of the two main data structures
type Place = Roastery | MatchaPlace;
type Mode = 'coffee' | 'matcha';

interface ModeContextType {
  mode: Mode;
  appMode: Mode; // Alias for compatibility with existing code
  toggleMode: () => void;
  theme: {
    primary: string; // e.g., 'blue-600' or 'emerald-600'
    text: string;    // e.g., 'text-blue-900' or 'text-emerald-900'
  };
}

// 1. Create the Context
const ModeContext = createContext<ModeContextType | undefined>(undefined);

// 2. Create the Provider Component
export const ModeContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('appMode');
      return (saved === 'coffee' || saved === 'matcha') ? saved : 'coffee';
    }
    return 'coffee';
  });

  // Persist mode to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appMode', mode);
    }
  }, [mode]);

  // Function to switch between modes
  const toggleMode = React.useCallback(() => {
    setMode((prevMode) => (prevMode === 'coffee' ? 'matcha' : 'coffee'));
  }, []);

  // Memoize the theme values based on the current mode
  // Only depend on mode, not on data (data is loaded separately via usePlaceData)
  const contextValue = useMemo(() => {
    const theme = mode === 'coffee'
      ? { primary: 'blue-600', text: 'text-blue-900' }
      : { primary: 'emerald-600', text: 'text-emerald-900' };

    return { mode, appMode: mode, toggleMode, theme };
  }, [mode, toggleMode]);

  return (
    <ModeContext.Provider value={contextValue}>
      {children}
    </ModeContext.Provider>
  );
};

// 3. Create a Custom Hook for easy consumption
export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeContextProvider');
  }
  return context;
};
