import { useEffect, useRef, useState } from "react";
import type { GpsStatus } from "@/types/guide";
import {
  createLocationDiagnostics,
  readLocationPermission,
  type LocationAttempt,
  type LocationDiagnostics,
  type LocationFailure,
} from "@/lib/geolocation-diagnostics";

interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Owns the "locate me" feature: the resolved user location, the GPS status and
 * its (auto-fading) message, and a fly-to trigger key the map consumes. Exposes
 * a single toggle handler (request location, or clear it if already set) plus
 * setUserLocation so callers can clear the location from elsewhere.
 */
export function useGeolocation() {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [gpsMessageFading, setGpsMessageFading] = useState(false);
  const [gpsDiagnostics, setGpsDiagnostics] = useState<LocationDiagnostics | null>(null);
  const [flyToUserKey, setFlyToUserKey] = useState(0);
  const requestIdRef = useRef(0);
  const locatingRef = useRef(false);

  useEffect(() => () => {
    // getCurrentPosition cannot be cancelled. Ignore callbacks after unmount.
    requestIdRef.current += 1;
    locatingRef.current = false;
  }, []);

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
    // A ref also catches rapid taps before React has rendered the busy state.
    if (locatingRef.current) return;

    // Invalidate pending diagnostic reads as well as old location callbacks.
    const requestId = ++requestIdRef.current;
    setGpsDiagnostics(null);
    const attempts: LocationAttempt[] = [];
    const captureFailure = (error: LocationFailure) => {
      setGpsDiagnostics(createLocationDiagnostics(error, attempts));
      void readLocationPermission().then((permission) => {
        if (requestIdRef.current !== requestId) return;
        setGpsDiagnostics((current) => current ? { ...current, permission } : null);
      });
    };

    // If location is already set, clear it (toggle off)
    if (userLocation) {
      setUserLocation(null);
      setIsLocating(false);
      setGpsStatus("idle");
      setGpsMessage(null);
      return;
    }

    if (!navigator.geolocation) {
      captureFailure({
        source: "unsupported", code: null, name: "GeolocationUnavailable",
        message: "navigator.geolocation is unavailable",
      });
      setGpsStatus("unsupported");
      setGpsMessage("הדפדפן לא תומך בשירותי מיקום. אפשר לחפש כתובת");
      return;
    }

    // navigator.onLine is only a connectivity hint. The device may still have
    // a usable GPS/cached position even when that hint says it is offline.
    locatingRef.current = true;
    setIsLocating(true);
    setGpsStatus("locating");
    setGpsMessage("מאתרים את המיקום שלך...");

    const isCurrentRequest = () =>
      requestIdRef.current === requestId && locatingRef.current;

    const showError = (code: number, error: LocationFailure) => {
      if (!isCurrentRequest()) return;
      console.error("Geolocation error:", error);
      captureFailure(error);
      locatingRef.current = false;
      setIsLocating(false);
      if (code === 1) {
        setGpsStatus("denied");
        setGpsMessage("הדפדפן לא אפשר גישה למיקום. אפשר לנסות שוב או לחפש כתובת");
      } else if (code === 2) {
        setGpsStatus("unavailable");
        setGpsMessage("המכשיר לא הצליח לספק מיקום. נסו שוב או חפשו כתובת");
      } else if (code === 3) {
        setGpsStatus("timeout");
        setGpsMessage("חיפוש המיקום ארך יותר מדי זמן. נסו שוב או חפשו כתובת");
      } else {
        setGpsStatus("error");
        setGpsMessage("לא הצלחנו למצוא את המיקום שלך. נסו שוב או חפשו כתובת");
      }
    };

    const requestPosition = (highAccuracy: boolean) => {
      const options: PositionOptions = {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 20000 : 10000,
        maximumAge: highAccuracy ? 0 : 60000,
      };
      const startedAt = performance.now();
      const userActivation = navigator.userActivation?.isActive ?? null;
      const recordFailure = (error: LocationFailure) => {
        attempts.push({ options, elapsedMs: Math.round(performance.now() - startedAt), userActivation, error });
      };
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!isCurrentRequest()) return;
            locatingRef.current = false;
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setFlyToUserKey((prev) => prev + 1);
            setIsLocating(false);
            setGpsStatus("success");
            setGpsMessage("המיקום עודכן בהצלחה");
          },
          (error) => {
            if (!isCurrentRequest()) return;
            const failure: LocationFailure = {
              source: "geolocation",
              code: error.code,
              name: ({ 1: "PERMISSION_DENIED", 2: "POSITION_UNAVAILABLE", 3: "TIMEOUT" } as Record<number, string>)[error.code] ?? "UNKNOWN_ERROR",
              message: error.message,
            };
            recordFailure(failure);
            // Permission does not guarantee a position. If the quick attempt
            // fails, request a fresh fix with a higher-accuracy hint once.
            // Never retry a denial or repeatedly prompt for permission.
            if (!highAccuracy && (error.code === 2 || error.code === 3)) {
              setGpsMessage("המיקום מתעכב, מנסים שוב...");
              requestPosition(true);
              return;
            }
            showError(error.code, failure);
          },
          options,
        );
      } catch (error) {
        if (!isCurrentRequest()) return;
        // A synchronous browser exception must not leave the button spinning.
        const denied = error instanceof DOMException &&
          (error.name === "SecurityError" || error.name === "NotAllowedError");
        const namedError = error instanceof Error || error instanceof DOMException;
        const failure: LocationFailure = {
          source: "exception",
          code: error instanceof DOMException ? error.code : null,
          name: namedError ? error.name : "UnknownError",
          message: namedError ? error.message : String(error),
        };
        recordFailure(failure);
        showError(denied ? 1 : 0, failure);
      }
    };

    requestPosition(false);
  };

  return {
    userLocation,
    setUserLocation,
    isLocating,
    gpsStatus,
    gpsMessage,
    gpsMessageFading,
    gpsDiagnostics,
    flyToUserKey,
    handleGetUserLocation,
  };
}
