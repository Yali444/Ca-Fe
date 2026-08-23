import { describe, expect, it } from "vitest";

import manifest from "./manifest";

const m = manifest();

describe("manifest", () => {
  // The install prompt is silently withheld when any of these is missing or
  // malformed, and nothing in the build warns about it.
  it("carries the fields a browser needs to offer installation", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("keeps short_name within the 12 characters launchers show", () => {
    expect(m.short_name!.length).toBeLessThanOrEqual(12);
  });

  it("declares Hebrew and right-to-left, matching the content", () => {
    expect(m.lang).toBe("he");
    expect(m.dir).toBe("rtl");
  });

  it("ships both icon sizes an installable PWA requires", () => {
    const sizes = m.icons!.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("includes a maskable icon so Android does not letterbox it", () => {
    expect(m.icons!.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("references icons by root-relative path", () => {
    for (const icon of m.icons!) {
      expect(icon.src.startsWith("/")).toBe(true);
    }
  });

  it("uses valid hex colours for the splash screen and theme", () => {
    expect(m.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(m.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("scopes the app to the whole origin", () => {
    expect(m.scope).toBe("/");
  });
});
