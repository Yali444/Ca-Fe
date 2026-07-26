import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHOP_IMAGE,
  mapPlaceToCoffeeShop,
} from "./coffee-shop";
import type { Place } from "@/types/place";

const place = (overrides: Partial<Place> = {}): Place => ({
  id: "p1",
  name: "Test Cafe",
  city: "Tel Aviv",
  address: "10 Levinsky St",
  openingHours: null,
  description: "A test cafe",
  vibeTags: ["cozy"],
  latitude: 32.0853,
  longitude: 34.7818,
  ...overrides,
});

describe("mapPlaceToCoffeeShop", () => {
  it("copies the canonical identity fields straight through", () => {
    const result = mapPlaceToCoffeeShop(place());
    expect(result.id).toBe("p1");
    expect(result.name).toBe("Test Cafe");
    expect(result.location).toBe("Tel Aviv");
    expect(result.address).toBe("10 Levinsky St");
    expect(result.description).toBe("A test cafe");
  });

  // `id` is a client-side slug-hash with no page of its own; `datasetId` is the
  // raw cafes.json id that /cafe/<id> is prerendered under, and is what
  // buildShareUrl needs. Dropping it silently turns every share into a 404.
  it("preserves datasetId alongside the client-side id", () => {
    const result = mapPlaceToCoffeeShop(place({ datasetId: "37" }));
    expect(result.datasetId).toBe("37");
    expect(result.id).toBe("p1");
  });

  it("defaults `location` to '' when city is null", () => {
    expect(mapPlaceToCoffeeShop(place({ city: null })).location).toBe("");
  });

  it("defaults `address` to null when missing", () => {
    expect(mapPlaceToCoffeeShop(place({ address: null })).address).toBeNull();
  });

  it("uses the Unsplash fallback image when no heroImage is set", () => {
    expect(mapPlaceToCoffeeShop(place()).image).toBe(DEFAULT_SHOP_IMAGE);
    expect(mapPlaceToCoffeeShop(place({ heroImage: null })).image).toBe(
      DEFAULT_SHOP_IMAGE,
    );
  });

  it("preserves a provided heroImage", () => {
    expect(
      mapPlaceToCoffeeShop(place({ heroImage: "/custom.jpg" })).image,
    ).toBe("/custom.jpg");
  });

  it("preserves zero coordinates instead of treating them as missing", () => {
    // Uses `??` not `||` — a real 0 (e.g. equator) must survive.
    const result = mapPlaceToCoffeeShop(place({ latitude: 0, longitude: 0 }));
    expect(result.lat).toBe(0);
    expect(result.lng).toBe(0);
  });

  it("falls back to 0/0 when coordinates are null (structurally unreachable in prod)", () => {
    const result = mapPlaceToCoffeeShop(
      place({ latitude: null, longitude: null }),
    );
    expect(result.lat).toBe(0);
    expect(result.lng).toBe(0);
  });

  it("coerces missing vibeTags to an empty array", () => {
    const broken = place();
    (broken as unknown as { vibeTags: unknown }).vibeTags = undefined;
    expect(mapPlaceToCoffeeShop(broken).vibeTags).toEqual([]);
  });

  it("defaults reviews to an empty array when missing", () => {
    expect(mapPlaceToCoffeeShop(place()).reviews).toEqual([]);
  });

  it("passes through optional fields when set", () => {
    const result = mapPlaceToCoffeeShop(
      place({
        brewMethods: ["אספרסו"],
        instagramHandle: "cafe_handle",
        website: "https://example.com",
        matchaOrigin: "Uji",
        milkOptions: "Oat",
        isRoaster: true,
        sellsBeans: true,
        type: "matcha",
      }),
    );
    expect(result.brewMethods).toEqual(["אספרסו"]);
    expect(result.instagram).toBe("cafe_handle");
    expect(result.website).toBe("https://example.com");
    expect(result.matchaOrigin).toBe("Uji");
    expect(result.milkOptions).toBe("Oat");
    expect(result.isRoaster).toBe(true);
    expect(result.sellsBeans).toBe(true);
    expect(result.type).toBe("matcha");
  });

  it("defaults type to undefined when the source has no `type` property", () => {
    const noType = place();
    // Remove the type field so the `in` check returns false.
    delete (noType as { type?: unknown }).type;
    expect(mapPlaceToCoffeeShop(noType).type).toBeUndefined();
  });

  it("specialty is always the empty string (UI-only field, never sourced)", () => {
    expect(mapPlaceToCoffeeShop(place()).specialty).toBe("");
  });

  it("propagates hidden / roasteryOnly / isOnlineOnly flags", () => {
    const result = mapPlaceToCoffeeShop(
      place({ hidden: true, roasteryOnly: true, isOnlineOnly: true }),
    );
    expect(result.hidden).toBe(true);
    expect(result.roasteryOnly).toBe(true);
    expect(result.isOnlineOnly).toBe(true);
  });
});
