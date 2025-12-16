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
  const [mode, setMode] = useState<Mode>('coffee');
  const [data, setData] = useState<Place[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Persist mode to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appMode', mode);
    }
  }, [mode]);

  // Lazy load data to prevent mobile Safari crashes
  useEffect(() => {
    let cancelled = false;
    
    // Detect mobile Safari
    const isMobileSafari = typeof navigator !== "undefined" && (
      /iP(hone|od|ad)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    ) && /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|OPiOS/.test(navigator.userAgent);
    
    const loadData = async () => {
      // Add delay on mobile Safari
      if (isMobileSafari) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      if (cancelled) return;
      
      try {
        if (mode === 'coffee') {
          const { ROASTERIES } = await import('@/data/roasteries');
          if (!cancelled) {
            setData(ROASTERIES as Place[]);
            setDataLoaded(true);
          }
        } else {
          const { MATCHA_PLACES } = await import('@/data/matcha');
          if (!cancelled) {
            setData(MATCHA_PLACES as Place[]);
            setDataLoaded(true);
          }
        }
      } catch (err) {
        console.error('Error loading data in ModeContext:', err);
        if (!cancelled) {
          setData([]);
          setDataLoaded(true);
        }
      }
    };
    
    loadData();
    
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Function to switch between modes
  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'coffee' ? 'matcha' : 'coffee'));
    setDataLoaded(false); // Reset data loaded when switching modes
  };

  // Memoize the theme values based on the current mode
  const contextValue = useMemo(() => {
    const theme = mode === 'coffee'
      ? { primary: 'blue-600', text: 'text-blue-900' }
      : { primary: 'emerald-600', text: 'text-emerald-900' };

    return { mode, appMode: mode, data, toggleMode, theme };
  }, [mode, data]);

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
