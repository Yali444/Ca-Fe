import L from 'leaflet';

// Coffee Mode Icons
export const createCoffeeMarker = (): L.Icon => {
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

// Matcha Mode Icons
export const createMatchaMarker = (): L.Icon => {
  return L.divIcon({
    className: 'custom-matcha-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
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
        ">🍵</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Roastery Icon (for coffee roasteries specifically)
export const createRoasteryMarker = (): L.Icon => {
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
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};


