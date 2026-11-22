import type { CoffeeShop } from "@/lib/coffee-shop";
import { isNewCafe } from "@/lib/is-new-cafe";

export function NewCafeBadge({ shop, className }: { shop: CoffeeShop; className: string }) {
  if (!isNewCafe(shop)) return null;
  return (
    <span className={`pointer-events-none absolute rounded-full bg-brand px-2.5 py-1 text-xs font-semibold leading-none text-white shadow-sm ${className}`}>
      חדש
    </span>
  );
}
