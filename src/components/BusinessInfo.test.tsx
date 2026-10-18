// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { BusinessInfo } from "./BusinessInfo";
import { findCafeMeta } from "@/lib/cafe-lookup";
import { transformCafeToRoastery, type CafeRaw } from "@/data/roasteries";
import { normalizeCoffeePlace } from "@/hooks/usePlaceData";
import { mapPlaceToCoffeeShop } from "@/lib/coffee-shop";
import data from "../../public/data/cafes.json";

afterEach(cleanup);

it.each([
  [136, "בית קלייה", "אונליין בלבד"],
  [142, "בית קלייה", "איסוף עצמי בתיאום מראש"],
  [143, "סדנאות קפה", "סדנאות בתיאום מראש"],
] as const)("preserves business and visit details across server and client for %i", (id, kind, visit) => {
  const raw = data.find(c => Number(c.id) === id)!;
  const client = mapPlaceToCoffeeShop(normalizeCoffeePlace(transformCafeToRoastery(raw as unknown as CafeRaw)));
  const server = findCafeMeta(String(id))!;
  expect(client.businessType).toBe(server.businessType);
  expect(client.visitMode).toBe(server.visitMode);
  expect(client.visitNote).toBe(server.visitNote);
  expect(client.shopUrl).toBe(server.shopUrl);
  expect(server.hours).toBeNull();
  render(<BusinessInfo business={client} />);
  expect(screen.getByText(kind)).toBeInTheDocument();
  expect(screen.getByText(visit)).toBeInTheDocument();
  if (id !== 136) expect(screen.queryByText("אונליין בלבד")).not.toBeInTheDocument();
});

it("does not invent business or visiting details for unclassified cafes", () => {
  const { container } = render(<BusinessInfo business={{}} />);
  expect(container).toBeEmptyDOMElement();
});
