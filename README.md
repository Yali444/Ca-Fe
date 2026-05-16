# Ca-Fe — Israel Coffee Guide

A curated, interactive guide to specialty coffee shops and roasteries across Israel. Built with Next.js, powered by Supabase, and deployed on Vercel.

## Features

- **Interactive map** — browse cafes and roasteries on a clustered Leaflet map with live location support
- **Search & filter** — filter by city, tags (matcha, roastery, specialty), and open-now status
- **Place details** — opening hours, Instagram links, address, and community reviews via Disqus
- **Suggest a place** — submit new cafes through a built-in form (Formspree)
- **Dark mode** — full light/dark theme support
- **Offline support** — service worker caches data for offline browsing
- **PWA-ready** — installable on mobile and desktop

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, React 19) |
| Styling | Tailwind CSS v4, Framer Motion |
| UI Components | Radix UI, Lucide icons |
| Map | Leaflet + react-leaflet + MarkerCluster |
| Database | Supabase (PostgreSQL) |
| Analytics | Vercel Analytics |
| Reviews | Disqus |
| Forms | Formspree |
| Deployment | Vercel |

## Project Structure

```
src/
  app/          # Next.js App Router pages and layouts
  components/   # React components (map, cards, modals, UI)
  data/         # Static data loaders and matcha/roastery lists
  hooks/        # Custom hooks (place data, offline support)
  lib/          # Utilities (formatters, image helpers)
  types/        # TypeScript types
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run build:clean` | Clean `.next` then build |
| `npm run lint` | Run ESLint |

## Deployment

The app is deployed on Vercel. Any push to `main` triggers a production deploy automatically.

Set the same environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in your Vercel project settings.

## Contributing

Found a great cafe that's missing? Use the **Suggest a Place** button in the app, or open an issue.
