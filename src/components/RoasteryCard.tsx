import { instagramUrl } from "@/lib/formatters";
import type { Roastery } from "@/types/roastery";
import { TagPill } from "./TagPill";

export function RoasteryCard({ roastery }: { roastery: Roastery }) {
  const igLink = instagramUrl(roastery.instagramHandle);

  return (
    <article className="flex flex-col gap-4 rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-lg shadow-black/5 backdrop-blur border border-slate-200 dark:border-zinc-800">
      <header className="space-y-2">
          <h3 className="text-xl font-semibold text-coffee-ink dark:text-slate-100">{roastery.name}</h3>
        <p className="text-sm text-coffee-ink/70 dark:text-zinc-400">
        {roastery.city}
        </p>
        {roastery.address && (
          <p className="text-sm text-coffee-ink/80 dark:text-zinc-400">{roastery.address}</p>
        )}
      </header>

      <p className="text-sm leading-relaxed text-coffee-ink/90 dark:text-zinc-400">
        {roastery.description}
      </p>

      {roastery.brewMethods.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-coffee-ink/60">
            Brew Methods
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roastery.brewMethods.map((method) => (
              <TagPill key={method} label={method} variant="accent" />
            ))}
          </div>
        </div>
      )}

      {roastery.vibeTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {roastery.vibeTags.map((tag) => (
            <TagPill key={tag} label={tag} />
          ))}
        </div>
      )}

      <footer className="flex flex-wrap gap-3 text-sm text-coffee-ink/80 dark:text-zinc-400">
        {roastery.openingHours && <span>⏰ {roastery.openingHours}</span>}
        {igLink && (
          <a
            href={igLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-coffee-accent hover:underline"
          >
            <span aria-hidden>📸</span> Instagram
          </a>
        )}
        {roastery.website && (
          <a
            href={roastery.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-coffee-accent hover:underline"
          >
            <span aria-hidden>🌐</span> Website
          </a>
        )}
      </footer>
    </article>
  );
}