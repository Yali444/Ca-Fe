import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

import { getAllCities, getCafesByCity } from "@/lib/cafe-lookup";
import { cityItemListJsonLd, cityUrl } from "@/lib/structured-data";
import { getBlurPlaceholder } from "@/lib/image-utils";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ca-fe.xyz";
const aran = { fontFamily: "var(--font-aran), sans-serif" } as const;

export function generateStaticParams() {
  return getAllCities().map(({ city }) => ({ city }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: raw } = await params;
  const city = decodeURIComponent(raw);
  const cafes = getCafesByCity(city);
  if (cafes.length === 0) return {};

  const title = `בתי קפה ב${city} — ${cafes.length} מקומות מומלצים`;
  const description = `המדריך לבתי קפה ובתי קלייה מומלצים ב${city}: ${cafes
    .slice(0, 5)
    .map((c) => c.name)
    .join(", ")}${cafes.length > 5 ? " ועוד" : ""}.`;

  return {
    title,
    description,
    alternates: { canonical: cityUrl(siteUrl, city) },
    openGraph: { title, description, url: cityUrl(siteUrl, city) },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: raw } = await params;
  const city = decodeURIComponent(raw);
  const cafes = getCafesByCity(city);
  if (cafes.length === 0) notFound();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "מדריך הקפה", item: siteUrl },
      { "@type": "ListItem", position: 2, name: city, item: cityUrl(siteUrl, city) },
    ],
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-[#E0F2FE] via-[#F0F9FF] to-[#DBEAFE] dark:from-[#0B1120] dark:via-[#0B1120] dark:to-[#0B1120]"
      style={aran}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cityItemListJsonLd(city, cafes, siteUrl)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="font-medium text-[#0071E3] hover:underline dark:text-blue-300">
            מדריך הקפה
          </Link>
          <span>/</span>
          <span aria-current="page">{city}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-[#0C4A6E] dark:text-slate-100">
            בתי קפה ב{city}
          </h1>
          <p className="mt-1 text-base text-slate-600 dark:text-zinc-400">
            {cafes.length} בתי קפה ובתי קלייה מומלצים ב{city}
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cafes.map((cafe) => (
            <li key={cafe.id}>
              <Link
                href={`/cafe/${encodeURIComponent(cafe.id)}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <Image
                    src={cafe.image}
                    alt={cafe.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    placeholder="blur"
                    blurDataURL={getBlurPlaceholder(cafe.image)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <h2 className="text-lg font-bold leading-tight text-[#0C4A6E] dark:text-blue-100">
                    {cafe.name}
                  </h2>
                  {cafe.address && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{cafe.address}</p>
                  )}
                  {cafe.description && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {cafe.description}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0071E3] to-[#005BB5] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
          >
            <Icon name="Map" className="h-4 w-4" />
            פתח את המפה האינטראקטיבית
          </Link>
        </div>
      </div>
    </main>
  );
}
