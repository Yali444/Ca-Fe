import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

import { findCafeMeta, getAllCafeIds, getCafesByCity } from "@/lib/cafe-lookup";
import { THEMES } from "@/lib/themes";
import { breadcrumbJsonLd, cafeJsonLd, cafeUrl, themeUrl } from "@/lib/structured-data";
import { getBlurPlaceholder } from "@/lib/image-utils";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";

// Pre-render a static page for every cafe at build time.
export function generateStaticParams() {
  return getAllCafeIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const meta = findCafeMeta(id);
  if (!meta) return {};

  const title = `${meta.name}${meta.location ? ` · ${meta.location}` : ""}`;
  const description =
    meta.description ||
    `${meta.name}${meta.location ? ` ב${meta.location}` : ""} — מתוך מדריך הקפה המיוחד של ישראל`;
  const ogImage = `/opengraph-image/${encodeURIComponent(meta.id)}`;

  return {
    title,
    description,
    alternates: { canonical: cafeUrl(siteUrl, meta.id) },
    openGraph: {
      title,
      description,
      url: cafeUrl(siteUrl, meta.id),
      images: [{ url: ogImage, width: 1200, height: 630, alt: meta.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

// Israeli week order, with Hebrew labels.
const WEEK: [string, string][] = [
  ["sunday", "ראשון"],
  ["monday", "שני"],
  ["tuesday", "שלישי"],
  ["wednesday", "רביעי"],
  ["thursday", "חמישי"],
  ["friday", "שישי"],
  ["saturday", "שבת"],
];

const aran = { fontFamily: "var(--font-aran), sans-serif" } as const;

export default async function CafePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meta = findCafeMeta(id);
  if (!meta) notFound();

  const mapsHref =
    meta.lat != null && meta.lng != null
      ? `https://www.google.com/maps?q=${meta.lat},${meta.lng}`
      : null;

  // Internal linking: characteristic themes this cafe belongs to, and a few
  // other cafes in the same city.
  const themeChips = THEMES.filter((t) => t.match(meta));
  const nearby = meta.location
    ? getCafesByCity(meta.location)
        .filter((c) => c.id !== meta.id)
        .slice(0, 6)
    : [];

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:from-[#0B1120] dark:via-[#0B1120] dark:to-[#0B1120]"
      style={aran}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cafeJsonLd(meta, siteUrl)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(meta, siteUrl)) }}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="font-medium text-[#0071E3] hover:underline dark:text-blue-300">
            מדריך הקפה
          </Link>
          {meta.location && (
            <>
              <span>/</span>
              <Link
                href={`/city/${encodeURIComponent(meta.location)}`}
                className="font-medium text-[#0071E3] hover:underline dark:text-blue-300"
              >
                {meta.location}
              </Link>
            </>
          )}
          <span>/</span>
          <span aria-current="page" className="text-slate-700 dark:text-slate-200">
            {meta.name}
          </span>
        </nav>

        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative h-56 w-full sm:h-72">
            <Image
              src={meta.image}
              alt={meta.name}
              fill
              priority
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL={getBlurPlaceholder(meta.image)}
            />
          </div>

          <div className="space-y-6 p-6">
            <header>
              <h1 className="text-3xl font-bold text-[#0C4A6E] dark:text-slate-100">
                {meta.name}
              </h1>
              {(meta.location || meta.address) && (
                <p className="mt-1 flex items-center gap-1.5 text-base text-slate-600 dark:text-zinc-400">
                  <Icon name="MapPin" className="h-4 w-4 shrink-0" />
                  {[meta.location, meta.address].filter(Boolean).join(" · ")}
                </p>
              )}
            </header>

            {meta.description && (
              <p className="text-base leading-relaxed text-slate-700 dark:text-zinc-300">
                {meta.description}
              </p>
            )}

            {meta.hours && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase text-[#0071E3] dark:text-blue-300">
                  שעות פתיחה
                </h2>
                <dl className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-2">
                  {WEEK.map(([key, label]) => (
                    <div key={key} className="flex justify-between gap-4 pe-4">
                      <dt className="text-slate-500 dark:text-zinc-400">{label}</dt>
                      <dd className="font-medium text-slate-700 dark:text-zinc-200">
                        {meta.hours?.[key] ?? "סגור"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {meta.brewMethods.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase text-[#0071E3] dark:text-blue-300">
                  שיטות חליטה
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {meta.brewMethods.map((m) => (
                    <li
                      key={m}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {m}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {meta.vibeTags.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase text-[#0071E3] dark:text-blue-300">
                  אווירה
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {meta.vibeTags.map((t) => (
                    <li
                      key={t}
                      className="rounded-full bg-white px-3 py-1 text-sm text-[#075985] shadow-sm dark:bg-slate-800 dark:text-blue-300"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {themeChips.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase text-[#0071E3] dark:text-blue-300">
                  מאפיינים
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {themeChips.map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={themeUrl("", t.slug)}
                        className="inline-flex rounded-full border border-[#0071E3]/30 bg-[#0071E3]/5 px-3 py-1 text-sm font-medium text-[#0071E3] transition-colors hover:bg-[#0071E3]/10 dark:border-blue-400/30 dark:text-blue-300"
                      >
                        {t.chipLabel}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={`/?cafe=${encodeURIComponent(meta.id)}`}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0071E3] to-[#005BB5] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
              >
                פתח במפה האינטראקטיבית
                <Icon name="ArrowLeft" className="h-4 w-4" />
              </Link>
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-[#0C4A6E] shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-200"
                >
                  <Icon name="Navigation" className="h-4 w-4" />
                  נווט
                </a>
              )}
              {meta.website && (
                <a
                  href={meta.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-[#0C4A6E] shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-200"
                >
                  <Icon name="Globe" className="h-4 w-4" />
                  אתר
                </a>
              )}
              {meta.instagram && (
                <a
                  href={`https://instagram.com/${meta.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-[#0C4A6E] shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-200"
                >
                  <Icon name="Instagram" className="h-4 w-4" />
                  אינסטגרם
                </a>
              )}
            </div>
          </div>
        </article>

        {nearby.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-[#0C4A6E] dark:text-slate-100">
              עוד בתי קפה ב{meta.location}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {nearby.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/cafe/${encodeURIComponent(c.id)}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src={c.image}
                        alt={c.name}
                        fill
                        sizes="(min-width: 640px) 33vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        placeholder="blur"
                        blurDataURL={getBlurPlaceholder(c.image)}
                      />
                    </div>
                    <span className="truncate p-2 text-sm font-semibold text-[#0C4A6E] dark:text-blue-100">
                      {c.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
