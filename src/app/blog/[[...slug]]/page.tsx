import type { ResolvingMetadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OpinlyContent } from "@opinly/react";
import { buildBlogPostingJsonLd, buildFaqJsonLd, generateOpinlyMetadata, opinlyConfig } from "@opinly/next";
import { authorPath, categoryPath, imageUrl, postPath, postUrl, tagPath } from "@opinly/shared";
import type { OpinlyNode, SeoResolved } from "@opinly/shared";
import type { PostList } from "@opinly/backend";
import { loadBlogRoute } from "@/lib/opinly/routes";

export const revalidate = false;

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ cursor?: string | string[] }>;
};

export async function generateMetadata(props: Props, parent: ResolvingMetadata) {
  if (!process.env.OPINLY_API_KEY) return { title: "בלוג", robots: { index: false, follow: false } };
  const { slug = [] } = await props.params;
  const route = await loadBlogRoute(slug.join("/"));
  const resolved: SeoResolved = route.type === "post" || route.type === "category" || route.type === "author" || route.type === "tag"
    ? { type: route.type, data: route.data } as SeoResolved
    : { type: route.type };
  const metadata = await generateOpinlyMetadata(resolved, parent);
  // Override inherited homepage Twitter text and avoid duplicating the title suffix.
  return { ...metadata, title: { absolute: String(metadata.title ?? "Ca Fe Blog") }, twitter: { card: "summary_large_image" as const, title: String(metadata.title ?? "Ca Fe Blog"), description: metadata.description ?? undefined, images: metadata.openGraph?.images } };
}

function JsonLd({ data }: { data: unknown }) {
  // CMS text can contain </script>; escape it before embedding JSON in HTML.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

function Posts({ list, path }: { list: PostList; path: string }) {
  return <>
    <div className="grid gap-6 sm:grid-cols-2">
      {list.data.map((post) => <article key={post.slug} className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-700">
        <Link href={postPath(opinlyConfig, post)} className="block h-full p-5">
          {post.image?.fileKey && <Image src={imageUrl(post.image.fileKey, opinlyConfig)} alt={post.image.alt ?? ""} width={720} height={405} className="mb-4 aspect-video w-full rounded-xl object-cover" />}
          <h2 className="text-2xl font-semibold" dir="auto">{post.title}</h2>
          <p className="mt-3 text-muted-foreground" dir="auto">{post.description}</p>
          <time className="mt-4 block text-sm text-muted-foreground" dateTime={post.firstPublishedAt}>{new Date(post.firstPublishedAt).toLocaleDateString("he-IL", { timeZone: "UTC" })}</time>
        </Link>
      </article>)}
    </div>
    {!list.data.length && <p>עדיין אין כתבות כאן.</p>}
    {list.has_more && list.next_cursor && <Link className="mt-8 inline-block rounded-xl border px-5 py-3" href={`${path}?cursor=${encodeURIComponent(list.next_cursor)}`}>לכתבות נוספות</Link>}
  </>;
}

export default async function BlogPage(props: Props) {
  const { slug = [] } = await props.params;
  if (!process.env.OPINLY_API_KEY) {
    if (slug.length) notFound();
    return <main id="main" className="mx-auto max-w-4xl px-6 py-16"><Link href="/">חזרה למפה</Link><h1 className="mt-8 text-4xl">הבלוג של Ca Fe</h1><p className="mt-4">כתבות על קפה ומאצ׳ה — בקרוב.</p></main>;
  }
  const query = await props.searchParams;
  const cursor = typeof query.cursor === "string" ? query.cursor : undefined;
  const route = await loadBlogRoute(slug.join("/"), cursor);
  if (route.type === "not-found") notFound();
  const path = `/blog${slug.length ? `/${slug.map(encodeURIComponent).join("/")}` : ""}`;

  return <main id="main" className="mx-auto min-h-screen max-w-5xl px-5 py-10 sm:px-8" style={{ fontFamily: "var(--font-aran), sans-serif" }}>
    <nav aria-label="ניווט בבלוג" className="mb-12 flex flex-wrap gap-6 text-sm">
      <Link href="/">מפת בתי הקפה</Link><Link href="/blog">הבלוג</Link><Link href="/blog/authors">הכותבים</Link>
    </nav>
    {route.type === "post" ? <article dir="auto" className="mx-auto max-w-3xl">
      <JsonLd data={{ ...buildBlogPostingJsonLd(route.data), url: postUrl(opinlyConfig, route.data), mainEntityOfPage: postUrl(opinlyConfig, route.data) }} />
      {route.data.faqs?.length ? <JsonLd data={buildFaqJsonLd(route.data.faqs)} /> : null}
      <h1 className="text-4xl font-bold sm:text-5xl">{route.data.title}</h1>
      <p className="mt-5 text-xl text-muted-foreground">{route.data.description}</p>
      <div className="my-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {route.data.author && <Link href={authorPath(opinlyConfig, route.data.author.slug)}>{route.data.author.name}</Link>}
        <time dateTime={route.data.firstPublishedAt}>{new Date(route.data.firstPublishedAt).toLocaleDateString("he-IL", { timeZone: "UTC" })}</time>
        {route.data.category && <Link href={categoryPath(opinlyConfig, route.data.category.slug)}>{route.data.category.name}</Link>}
      </div>
      {route.data.titleFile?.fileKey && <Image src={imageUrl(route.data.titleFile.fileKey, opinlyConfig)} alt={route.data.titleFile.altText ?? ""} width={1200} height={675} className="mb-8 h-auto w-full rounded-2xl" />}
      <div className="opinly-content">
        <OpinlyContent content={route.data.content as OpinlyNode} config={opinlyConfig} />
      </div>
      {route.data.faqs?.length ? <section className="mt-10 space-y-5"><h2 className="text-2xl font-semibold">שאלות נפוצות</h2>{route.data.faqs.map((faq, i) => <div key={i}><h3 className="font-semibold">{faq.question}</h3><p className="mt-2 leading-relaxed">{faq.answer}</p></div>)}</section> : null}
      <div className="mt-8 flex flex-wrap gap-3">{route.data.tags.map((tag) => <Link className="rounded-full border px-3 py-1 text-sm" key={tag.slug} href={tagPath(opinlyConfig, tag.slug)}>{tag.name}</Link>)}</div>
    </article> : route.type === "authors" ? <>
      <h1 className="mb-8 text-4xl font-bold">הכותבים</h1>
      <div className="space-y-6">{route.data.map((author) => <article key={author.slug} dir="auto"><h2 className="text-2xl"><Link href={authorPath(opinlyConfig, author.slug)}>{author.name}</Link></h2><p className="mt-2">{author.bio}</p></article>)}</div>
    </> : <>
      <h1 dir="auto" className="mb-6 text-4xl font-bold">{route.type === "home" ? "הבלוג של Ca Fe" : route.data.name}</h1>
      {route.type === "home" ? <div className="mb-8 flex flex-wrap gap-3">{route.categories.map((category) => <Link className="rounded-full border px-4 py-2" key={category.slug} href={categoryPath(opinlyConfig, category.slug)}>{category.title}</Link>)}</div>
        : <p dir="auto" className="mb-8 text-muted-foreground">{route.type === "author" ? route.data.bio : route.data.description}</p>}
      <Posts list={route.list} path={path} />
    </>}
  </main>;
}
