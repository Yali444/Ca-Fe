import { describe, expect, it } from "vitest";
import { formatLocationAddress } from "./location-label";

describe("formatLocationAddress", () => {
  it("does not repeat a city already present in the address", () => {
    expect(formatLocationAddress("תל אביב", "החשמל 12, תל אביב"))
      .toBe("החשמל 12, תל אביב");
  });
  it("shows both values when the address lacks the city", () => {
    expect(formatLocationAddress("מודיעין", "דם המכבים 55"))
      .toBe("דם המכבים 55 · מודיעין");
  });
  it("works with missing or city-only addresses", () => {
    expect(formatLocationAddress("תל אביב", "תל אביב")).toBe("תל אביב");
    expect(formatLocationAddress("חיפה", null)).toBe("חיפה");
    expect(formatLocationAddress(null, "הנמל 4")).toBe("הנמל 4");
  });
});
