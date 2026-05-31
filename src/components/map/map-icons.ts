import L from "leaflet";

// Static color schemes
export const blueColors = {
  primary: {
    text: "text-[#0071E3] dark:text-blue-300",
    textLight: "text-[#0071E3] dark:text-blue-200",
    gradient: "from-[#0071E3] to-[#005BB5]",
    gradientDark: "dark:from-[#3B9BFF] dark:to-[#0071E3]",
    shadow: "shadow-[#0071E3]/30",
    hoverShadow: "hover:shadow-[#0071E3]/40",
  }
};

export const greenColors = {
  primary: {
    text: "text-emerald-600 dark:text-emerald-300",
    textLight: "text-emerald-700 dark:text-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
    gradientDark: "dark:from-emerald-400 dark:to-emerald-500",
    shadow: "shadow-emerald-500/30",
    hoverShadow: "hover:shadow-emerald-500/40",
  }
};

// Create custom marker icon with white circular background
export const createCustomIcon = (iconUrl: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      ">
        <img
          src="${iconUrl}"
          alt="marker"
          style="
            width: 24px;
            height: 24px;
            display: block;
          "
        />
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

// Create custom marker icon for cafes (Coffee Glass) - Blue
export const createCafeMarker = () => {
  return createCustomIcon('/images/Coffee Glass Blue.svg');
};

// Create custom marker icon for matcha (Leaf/Tea) - Green
export const createMatchaMarker = () => {
  return createCustomIcon('/images/Matcha Leaf Green.svg');
};

// Create custom marker icon for roasteries (Coffee Beans)
export const createRoasteryMarker = () => {
  return createCustomIcon('/images/Coffee Beans Blue.svg');
};

export const createAddressMarker = () => createCustomIcon('/images/Map Pin Blue.svg');
export const createUserLocationMarker = () => createCustomIcon('/images/Map Pin Light Blue.svg');

// Define Israel bounds to restrict map view - expanded bounds for better zoom in peripheral areas
export const israelBounds = L.latLngBounds(
  [29.0, 34.0], // Southwest corner (south, west) - expanded bounds
  [33.5, 36.0]  // Northeast corner (north, east) - expanded bounds
);
