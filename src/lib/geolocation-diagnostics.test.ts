// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocationDiagnostics, readLocationPermission } from "./geolocation-diagnostics";

afterEach(() => vi.unstubAllGlobals());

const failure = { source: "geolocation", code: 1, name: "PERMISSION_DENIED", message: "Denied" } as const;

describe("location diagnostics", () => {
  it.each(["permissionsPolicy", "featurePolicy"])("reads %s without confusing site policy with permission", (api) => {
    vi.stubGlobal("document", { [api]: { allowsFeature: (feature: string) => feature !== "geolocation" } });
    expect(createLocationDiagnostics(failure, []).policy).toEqual({ state: "blocked", api });
  });

  it("reports unavailable or throwing policy APIs as unknown information, not denial", () => {
    vi.stubGlobal("document", {});
    expect(createLocationDiagnostics(failure, []).policy.state).toBe("unsupported");
    vi.stubGlobal("document", { featurePolicy: { allowsFeature: () => { throw new Error("Unavailable"); } } });
    expect(createLocationDiagnostics(failure, []).policy.state).toBe("unknown");
  });

  it("records browser context without including coordinates or a URL query/hash", async () => {
    vi.stubGlobal("window", { location: { origin: "https://www.ca-fe.xyz", href: "https://www.ca-fe.xyz/?lat=32&lng=34#private" }, isSecureContext: true });
    vi.stubGlobal("navigator", { userAgent: "Example browser", geolocation: { coords: { latitude: 32, longitude: 34 } } });
    const diagnostics = createLocationDiagnostics(failure, []);
    expect(diagnostics.origin).toBe("https://www.ca-fe.xyz");
    expect(diagnostics.secureContext).toBe(true);
    expect(JSON.stringify(diagnostics)).not.toMatch(/latitude|longitude|private|\?lat/);
    expect(await readLocationPermission()).toEqual({ state: "unsupported" });
  });
});
