import { describe, expect, it } from "vitest";
import { normalizeCoffeePlace } from "./usePlaceData";
import type { Roastery } from "@/types/roastery";

const roastery = (overrides: Partial<Roastery> = {}): Roastery => ({
  id: "test-id",
  name: "Test Cafe",
  city: "Tel Aviv",
  address: "Some Street 1",
  openingHours: null,
  description: "A test cafe",
  brewMethods: [],
  vibeTags: ["cozy"],
  ...overrides,
});

describe("normalizeCoffeePlace", () => {
  it("passes through the canonical fields unchanged", () => {
    const place = normalizeCoffeePlace(roastery());
    expect(place.id).toBe("test-id");
    expect(place.name).toBe("Test Cafe");
    expect(place.city).toBe("Tel Aviv");
    expect(place.address).toBe("Some Street 1");
    expect(place.description).toBe("A test cafe");
  });

  it("strips a single leading @ from instagram handles", () => {
    const place = normalizeCoffeePlace(
      roastery({ instagramHandle: "@cafe_handle" }),
    );
    expect(place.instagramHandle).toBe("cafe_handle");
  });

  it("leaves a clean instagram handle alone", () => {
    const place = normalizeCoffeePlace(
      roastery({ instagramHandle: "cafe_handle" }),
    );
    expect(place.instagramHandle).toBe("cafe_handle");
  });

  it("defaults missing optional fields to null", () => {
    const place = normalizeCoffeePlace(
      roastery({
        city: null,
        address: null,
        openingHours: null,
        instagramHandle: undefined,
        website: undefined,
        latitude: undefined,
        longitude: undefined,
        heroImage: undefined,
      }),
    );
    expect(place.city).toBeNull();
    expect(place.address).toBeNull();
    expect(place.openingHours).toBeNull();
    expect(place.instagramHandle).toBeNull();
    expect(place.website).toBeNull();
    expect(place.latitude).toBeNull();
    expect(place.longitude).toBeNull();
    expect(place.heroImage).toBeNull();
  });

  it("defaults type to 'coffee' when missing", () => {
    expect(normalizeCoffeePlace(roastery()).type).toBe("coffee");
  });

  it("preserves a matcha type", () => {
    expect(normalizeCoffeePlace(roastery({ type: "matcha" })).type).toBe(
      "matcha",
    );
  });

  it("starts with an empty reviews list (reviews are fetched separately)", () => {
    const place = normalizeCoffeePlace(roastery());
    expect(place.reviews).toEqual([]);
  });

  it("coerces a non-array vibeTags input to an empty array", () => {
    // The runtime guard exists because the upstream JSON has historically
    // contained null/undefined for this field on a few records.
    const broken = roastery();
    (broken as unknown as { vibeTags: unknown }).vibeTags = null;
    expect(normalizeCoffeePlace(broken).vibeTags).toEqual([]);
  });

  it("preserves zero-valued coordinates instead of nulling them", () => {
    const place = normalizeCoffeePlace(
      roastery({ latitude: 0, longitude: 0 }),
    );
    // 0 is a valid coordinate; using `??` (not `||`) in the impl is what
    // makes this pass — this test guards against a regression to `||`.
    expect(place.latitude).toBe(0);
    expect(place.longitude).toBe(0);
  });
});
