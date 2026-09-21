export interface LocationFailure {
  source: "geolocation" | "exception" | "unsupported";
  code: number | null;
  name: string;
  message: string;
}

export interface LocationAttempt {
  options: PositionOptions;
  elapsedMs: number;
  userActivation: boolean | null;
  error: LocationFailure;
}

export interface LocationPermission {
  state: PermissionState | "checking" | "unsupported" | "unknown";
  error?: string;
}

export interface LocationDiagnostics {
  version: "ca-fe-location-v1";
  capturedAt: string;
  error: LocationFailure;
  permission: LocationPermission;
  policy: {
    state: "allowed" | "blocked" | "unsupported" | "unknown";
    api?: "permissionsPolicy" | "featurePolicy";
  };
  origin: string;
  secureContext: boolean;
  embedded: boolean;
  visibility: DocumentVisibilityState;
  userAgent: string;
  attempts: LocationAttempt[];
}

interface Policy {
  allowsFeature: (feature: string) => boolean;
}

function readLocationPolicy(): LocationDiagnostics["policy"] {
  // Neither spelling is available in every browser. Missing information is
  // not evidence of a denial (in particular on Safari).
  const page = document as Document & {
    permissionsPolicy?: Policy;
    featurePolicy?: Policy;
  };
  try {
    const api = page.permissionsPolicy ? "permissionsPolicy" : "featurePolicy";
    const policy = page[api];
    if (!policy?.allowsFeature) return { state: "unsupported" };
    return { state: policy.allowsFeature("geolocation") ? "allowed" : "blocked", api };
  } catch {
    return { state: "unknown" };
  }
}

/** Called only on failure. No coordinates, URL query, storage or remote logging. */
export function createLocationDiagnostics(
  error: LocationFailure,
  attempts: LocationAttempt[],
): LocationDiagnostics {
  return {
    version: "ca-fe-location-v1",
    capturedAt: new Date().toISOString(),
    error,
    permission: { state: "checking" },
    policy: readLocationPolicy(),
    origin: window.location.origin,
    secureContext: window.isSecureContext === true,
    embedded: window.self !== window.top,
    visibility: document.visibilityState,
    userAgent: navigator.userAgent,
    attempts: [...attempts],
  };
}

/** Query after the native location request; never gate it on this optional API. */
export async function readLocationPermission(): Promise<LocationPermission> {
  try {
    if (!navigator.permissions?.query) return { state: "unsupported" };
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return { state: permission.state };
  } catch (error) {
    return {
      state: "unknown",
      error: error instanceof Error || error instanceof DOMException
        ? `${error.name}: ${error.message}` : String(error),
    };
  }
}
