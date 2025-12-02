// @/context/ModeContext.tsx

import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import { ROASTERIES } from '@/data/roasteries';
import { MATCHA_PLACES, MatchaPlace } from '@/data/matcha';
import { Roastery } from '@/types/roastery';

// Define the Place type as a union of the two main data structures
type Place = Roastery | MatchaPlace;
type Mode = 'coffee' | 'matcha';

interface ModeContextType {
  mode: Mode;
  appMode: Mode; // Alias for compatibility with existing code
  data: Place[];
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
    if (typeof window === "undefined") return 'coffee';
    const saved = localStorage.getItem('appMode');
    return (saved === 'matcha' || saved === 'coffee') ? saved : 'coffee';
  });

  // Persist mode to localStorage
  React.useEffect(() => {
    localStorage.setItem('appMode', mode);
  }, [mode]);

  // Function to switch between modes
  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'coffee' ? 'matcha' : 'coffee'));
  };

  // Memoize the dynamic data and theme values based on the current mode
  const contextValue = useMemo(() => {
    const data = mode === 'coffee' ? (ROASTERIES as Place[]) : (MATCHA_PLACES as Place[]);
    const theme = mode === 'coffee'
      ? { primary: 'blue-600', text: 'text-blue-900' }
      : { primary: 'emerald-600', text: 'text-emerald-900' };

    return { mode, appMode: mode, data, toggleMode, theme };
  }, [mode]);

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
