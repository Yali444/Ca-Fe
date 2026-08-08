"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useFavorites } from "@/hooks/useFavorites";
import { buildShareUrl } from "@/lib/share";
import { tapHaptic } from "@/lib/haptics";

/**
 * Interactive actions for the static /cafe/[id] page: share and save-to-
 * favorites. A small client island so the rest of the page stays server-
 * rendered.
 *
 * The favorite is keyed by the client `placeId` (generatePlaceId(name,
 * rawCity)) — the same key the interactive app uses — so a cafe saved here
 * shows as saved in the app and vice-versa. Sharing uses the cafe's own
 * canonical /cafe/<datasetId> URL.
 */
export function CafeActions({
  datasetId,
  placeId,
  name,
}: {
  datasetId: string;
  placeId: string;
  name: string;
}) {
  const { favorites, toggleFavorite } = useFavorites();
  const isFavorite = favorites.includes(placeId);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = buildShareUrl(datasetId);
    if (!url) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // User dismissed the share sheet, or it failed — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — nothing more we can do silently.
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => toggleFavorite(placeId)}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? `הסר את ${name} ממועדפים` : `הוסף את ${name} למועדפים`}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800"
      >
        <Icon
          name="Heart"
          className={`h-4 w-4 ${isFavorite ? "fill-brand text-brand" : ""}`}
        />
        {isFavorite ? "שמור במועדפים" : "שמירה למועדפים"}
      </button>
      <button
        type="button"
        onClick={handleShare}
        aria-label={`שתף את ${name}`}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800"
        onPointerDown={() => tapHaptic()}
      >
        <Icon name="Share2" className="h-4 w-4" />
        {copied ? "הקישור הועתק" : "שיתוף"}
      </button>
    </div>
  );
}
