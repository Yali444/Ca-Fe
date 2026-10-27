// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PlacePicker } from "./PlacePicker";
import type { CoffeeShop } from "@/lib/coffee-shop";
const cafe = (id: string, extra: Partial<CoffeeShop> = {}): CoffeeShop => ({
  id, name: id, location: "תל אביב", address: "רחוב 1", lat: 32, lng: 34,
  image: "", specialty: "", description: "", vibeTags: ["חמים וביתי"], reviews: [],
  brewMethods: ["פילטר"], ...extra,
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("chooses only eligible matches, opens their details, and does not repeat until the pool is exhausted", () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const onSelectShop = vi.fn();
  const a = cafe("A"); const b = cafe("B");
  render(<PlacePicker shops={[cafe("hidden", {hidden:true}), cafe("online", {isOnlineOnly:true}), cafe("web", {visitMode:"online"}), a, b]} onSelectShop={onSelectShop} />);
  fireEvent.click(screen.getByRole("button", {name:"תבחרו לי מקום"}));
  expect(screen.getByRole("heading", {name:"A"})).toBeVisible();
  fireEvent.click(screen.getByRole("button", {name:"לפרטים על A"}));
  expect(onSelectShop).toHaveBeenCalledWith(a);
  fireEvent.click(screen.getByRole("button", {name:"עוד אפשרות"}));
  expect(screen.getByRole("heading", {name:"B"})).toBeVisible();
  fireEvent.click(screen.getByRole("button", {name:"עוד אפשרות"}));
  expect(screen.getByRole("heading", {name:"A"})).toBeVisible();
});
it("clears a suggestion when filtering changes and handles a single appointment-only match", () => {
  const props = {onSelectShop: vi.fn()};
  const view=render(<PlacePicker {...props} shops={[cafe("A")]} />);
  fireEvent.click(screen.getByRole("button", {name:"תבחרו לי מקום"}));
  expect(screen.getByRole("button", {name:"זו האפשרות היחידה"})).toBeDisabled();
  view.rerender(<PlacePicker {...props} shops={[cafe("B", {visitMode:"appointment",visitNote:"לתאם בטלפון"})]} />);
  expect(screen.queryByRole("heading", {name:"A"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"תבחרו לי מקום"}));
  expect(screen.getByText(/הביקור בתיאום מראש/)).toHaveTextContent("לתאם בטלפון");
  view.rerender(<PlacePicker {...props} shops={[]} />);
  expect(screen.getByRole("button", {name:"תבחרו לי מקום"})).toBeDisabled();
  expect(screen.queryByRole("heading", {name:"B"})).not.toBeInTheDocument();
});
