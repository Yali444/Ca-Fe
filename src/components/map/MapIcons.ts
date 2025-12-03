import L from 'leaflet';

// Coffee Mode Icons
export const createCoffeeMarker = (): L.DivIcon => {
  // ... existing code ...
  return L.divIcon({
    className: 'custom-coffee-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: 18px;
          font-weight: bold;
        ">☕</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Matcha Mode Icons - Using the Leaf icon design from lucide-react (matching the sidebar icon)
export const createMatchaMarker = (): L.DivIcon => {
  return L.divIcon({
    className: 'custom-matcha-marker',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          stroke-width="2.5" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          style="
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
          "
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

// Roastery Icon (for coffee roasteries specifically)
export const createRoasteryMarker = (): L.DivIcon => {
  return L.divIcon({
    className: 'custom-roastery-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: 20px;
          font-weight: bold;
        ">🌰</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};


