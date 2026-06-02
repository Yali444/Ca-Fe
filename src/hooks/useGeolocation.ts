import { useEffect, useState } from "react";
import type { GpsStatus } from "@/types/guide";

interface LatLng {
  lat: number;
  lng: number;
}

interface UseGeolocationOptions {
  /** Network status; locating is blocked while offline. */
  isOnline: boolean;
}

/**
 * Owns the "locate me" feature: the resolved user location, the GPS status and
 * its (auto-fading) message, and a fly-to trigger key the map consumes. Exposes
 * a single toggle handler (request location, or clear it if already set) plus
 * setUserLocation so callers can clear the location from elsewhere.
 */
export function useGeolocation({ isOnline }: UseGeolocationOptions) {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [gpsMessageFading, setGpsMessageFading] = useState(false);
  const [flyToUserKey, setFlyToUserKey] = useState(0);

  // Auto-dismiss the success message after a short delay (fade, then hide).
  useEffect(() => {
    if (gpsStatus !== "success") return;

    // No need to reset `gpsMessageFading` here: it starts false and the cleanup
    // below always restores it to false, so it is already false on every entry.
    const fadeTimer = setTimeout(() => {
      setGpsMessageFading(true);
    }, 2200);

    const hideTimer = setTimeout(() => {
      setGpsStatus("idle");
      setGpsMessage(null);
      setGpsMessageFading(false);
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      setGpsMessageFading(false);
    };
  }, [gpsStatus]);

  // Get the user's current location once (no continuous watching). Toggles off
  // if a location is already set.
  const handleGetUserLocation = () => {
    if (!isOnline) {
      setGpsStatus("error");
      setGpsMessage("אין חיבור לאינטרנט כרגע");
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus("unsupported");
      setGpsMessage("הדפדפן לא תומך בשירותי מיקום");
      return;
    }

    // If location is already set, clear it (toggle off)
    if (userLocation) {
      setUserLocation(null);
      setIsLocating(false);
      setGpsStatus("idle");
      setGpsMessage(null);
      return;
    }

    setIsLocating(true);
    setGpsStatus("locating");
    setGpsMessage("מאתרים את המיקום שלך...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setFlyToUserKey((prev) => prev + 1); // Trigger fly-to only once
        setIsLocating(false);
        setGpsStatus("success");
        setGpsMessage("המיקום עודכן בהצלחה");
      },
      (error) => {
        console.error('Geolocation error:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT,
        });
        setIsLocating(false);
        // Check error code correctly (PERMISSION_DENIED = 1)
        if (error.code === 1 || error.code === error.PERMISSION_DENIED) {
          setGpsStatus("denied");
          setGpsMessage("אין הרשאת מיקום. אפשרו הרשאה בדפדפן ונסו שוב");
        } else if (error.code === 2 || error.code === error.POSITION_UNAVAILABLE) {
          setGpsStatus("unavailable");
          setGpsMessage("המיקום לא זמין כרגע");
        } else if (error.code === 3 || error.code === error.TIMEOUT) {
          setGpsStatus("timeout");
          setGpsMessage("פג זמן החיפוש. ודאו שהמיקום פעיל ונסו שוב");
        } else {
          setGpsStatus("error");
          setGpsMessage("לא הצלחנו למצוא את המיקום שלך");
        }
      },
      {
        enableHighAccuracy: false, // Use faster network-based location
        timeout: 20000, // 20 seconds timeout
        maximumAge: 60000, // Accept cached location up to 1 minute old for faster response
      }
    );
  };

  return {
    userLocation,
    setUserLocation,
    isLocating,
    gpsStatus,
    gpsMessage,
    gpsMessageFading,
    flyToUserKey,
    handleGetUserLocation,
  };
}
