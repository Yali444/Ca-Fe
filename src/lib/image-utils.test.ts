import { describe, expect, it } from "vitest";
import { blurPlaceholders, getBlurPlaceholder } from "./image-utils";

describe("getBlurPlaceholder", () => {
  it("returns the large placeholder for paths containing 'hero'", () => {
    expect(getBlurPlaceholder("/images/hero-shop.jpg")).toBe(
      blurPlaceholders.large,
    );
    expect(getBlurPlaceholder("hero.png")).toBe(blurPlaceholders.large);
  });

  it("returns the large placeholder for paths containing 'large'", () => {
    expect(getBlurPlaceholder("/img/cafe-large.webp")).toBe(
      blurPlaceholders.large,
    );
  });

  it("falls back to the medium placeholder for everything else", () => {
    expect(getBlurPlaceholder("/images/marker.svg")).toBe(
      blurPlaceholders.medium,
    );
    expect(getBlurPlaceholder("")).toBe(blurPlaceholders.medium);
    expect(getBlurPlaceholder("photo.jpg")).toBe(blurPlaceholders.medium);
  });

  it("is case-sensitive: 'Hero' does not match the 'hero' branch", () => {
    // Documents existing behavior — String#includes is case-sensitive, and
    // the current convention is lowercase paths.
    expect(getBlurPlaceholder("/images/Hero.jpg")).toBe(
      blurPlaceholders.medium,
    );
  });
});

describe("blurPlaceholders", () => {
  it("exposes small/medium/large data-URI strings", () => {
    expect(blurPlaceholders.small).toMatch(/^data:image\/svg\+xml,/);
    expect(blurPlaceholders.medium).toMatch(/^data:image\/svg\+xml,/);
    expect(blurPlaceholders.large).toMatch(/^data:image\/svg\+xml,/);
  });
});
