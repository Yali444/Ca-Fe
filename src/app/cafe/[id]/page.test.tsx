// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import CafePage from "./page";
import { findCafeMeta } from "@/lib/cafe-lookup";

vi.mock("@/lib/reviews-server", () => ({ fetchCafeReviews: async () => [] }));
vi.mock("@/lib/ratings", () => ({ getRatingForMeta: () => null }));
vi.mock("@/components/CafeActions", () => ({ CafeActions: () => null }));
vi.mock("@/components/ui/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(cleanup);

describe("non-public business pages", () => {
  it.each([
    ["19", "קנופי קפה", "קניית פולים בתיאום מראש"],
    ["38", "Brewkva", "אונליין בלבד"],
    ["42", "אורו", "אונליין בלבד"],
    ["115", "Chicco di Caffe - קיקו די קפה", "אונליין בלבד"],
    ["136", "Brew Brothers", "אונליין בלבד"],
    ["142", "FirstCrack", "איסוף עצמי בתיאום מראש"],
    ["143", "ConceptCoffee", "סדנאות בתיאום מראש"],
  ])("renders %s (%s) without public hours or map actions", async (id, _name, visit) => {
    const meta = findCafeMeta(id)!;
    expect(meta).not.toBeNull();
    expect(meta.isOnlineOnly).toBe(true);
    expect(meta.hours).toBeNull();
    render(await CafePage({ params: Promise.resolve({ id }) }));
    expect(screen.getByRole("heading", { level: 1, name: meta.name })).toBeInTheDocument();
    expect(screen.getByText(visit)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "שעות פתיחה" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /פתח במפה/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "נווט" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: meta.shopUrl ? "לחנות האונליין" : "אתר" })).toHaveAttribute("href", meta.shopUrl || meta.website);
  });

  it("keeps hours and both map actions for a public cafe", async () => {
    render(await CafePage({ params: Promise.resolve({ id: "162" }) }));
    expect(screen.getByRole("heading", { name: "שעות פתיחה" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /פתח במפה/ })).toHaveAttribute("href", "/?cafe=162");
    expect(screen.getByRole("link", { name: "נווט" })).toHaveAttribute("href", expect.stringContaining("https://www.google.com/maps?q="));
  });
});
