import type { CoffeeShop } from "./coffee-shop";

const israelDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function isNewCafe(
  { addedAt, roasteryOnly, isOnlineOnly }: Pick<CoffeeShop, "addedAt" | "roasteryOnly" | "isOnlineOnly">,
  now = new Date(),
): boolean {
  if (roasteryOnly || isOnlineOnly || !addedAt || !/^\d{4}-\d{2}-\d{2}$/.test(addedAt)) return false;
  const added = new Date(addedAt);
  if (!Number.isFinite(added.getTime()) || added.toISOString().slice(0, 10) !== addedAt) return false;

  // Compare calendar dates at UTC midnight so daylight-saving changes cannot shift the cutoff.
  const ageDays = (Date.parse(israelDate.format(now)) - added.getTime()) / 86_400_000;
  return ageDays >= 0 && ageDays <= 30;
}
