import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { CoffeeShop } from "@/lib/coffee-shop";

interface PlacePickerProps {
  shops: CoffeeShop[];
  onSelectShop: (shop: CoffeeShop) => void;
}

/** The input is the full filtered catalogue, never just its first page. */
export function PlacePicker({ shops, onSelectShop }: PlacePickerProps) {
  const candidates = shops.filter(shop => !shop.hidden && !shop.isOnlineOnly && shop.visitMode !== "online");
  // A changed result set starts a fresh selection, without an effect or a
  // stale suggestion flashing after a filter change.
  return <PickerSession key={JSON.stringify(candidates.map(shop => shop.id))} shops={candidates} onSelectShop={onSelectShop} />;
}

function PickerSession({ shops, onSelectShop }: PlacePickerProps) {
  const [seen, setSeen] = useState<string[]>([]);
  const selected = shops.find(shop => shop.id === seen.at(-1));

  function choose() {
    let remaining = shops.filter(shop => !seen.includes(shop.id));
    let history = seen;
    if (!remaining.length) {
      remaining = shops.filter(shop => shop.id !== selected?.id);
      history = [];
    }
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    if (next) setSeen([...history, next.id]);
  }

  return (
    <div className="mt-4 rounded-2xl border border-brand/15 bg-brand/5 p-4 dark:bg-brand/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">קשה לבחור?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {shops.length ? "נבחר באקראי מקום מתוך התוצאות שלכם." : "אין כרגע מקומות לביקור שמתאימים לסינון."}
          </p>
        </div>
        <button
          type="button"
          onClick={choose}
          disabled={!shops.length || (!!selected && shops.length === 1)}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <Icon name="RefreshCw" className="h-4 w-4" />
          {selected ? shops.length === 1 ? "זו האפשרות היחידה" : "עוד אפשרות" : "תבחרו לי מקום"}
        </button>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {selected && (
          <div className="mt-4 border-t border-brand/15 pt-4">
            <p className="text-xs font-medium text-muted-foreground">הבחירה שלכם להפעם</p>
            <h3 className="mt-1 text-xl font-bold text-foreground">{selected.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{selected.location}{selected.address ? ` · ${selected.address}` : ""}</p>
            <p className="mt-2 text-sm text-foreground">
              {[...(selected.brewMethods ?? []).slice(0, 2), ...(selected.sellsBeans ? ["מוכרים פולים"] : []), ...selected.vibeTags.slice(0, 1)].join(" · ") || "המקום נכלל בתוצאות לפי הסינון הנוכחי שלכם."}
            </p>
            {selected.visitMode === "appointment" && <p className="mt-2 text-sm font-medium text-foreground">הביקור בתיאום מראש{selected.visitNote ? ` — ${selected.visitNote}` : ""}</p>}
            <button type="button" onClick={() => onSelectShop(selected)} className="mt-3 min-h-[44px] rounded-lg px-2 text-sm font-semibold text-brand underline underline-offset-4">
              לפרטים על {selected.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
