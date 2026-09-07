# Security setup

The code uses Supabase only on the server. No database credential belongs in a
`NEXT_PUBLIC_*` variable or in browser JavaScript.

## Required owner actions

1. In the correct Supabase project's API Keys settings, revoke the previously
   exposed secret. Removing it from Vercel or deploying new code does not revoke
   downloaded copies. Review API/database logs for unexpected activity.
2. Apply [the migration](supabase/migrations/202609070001_api_security.sql) as
   the project owner using the Supabase SQL Editor. It preserves review rows,
   restricts the review table to server access, and creates an atomic limiter.
   It assumes the existing `public."Cafe Reviews"` table and its `id` column.
3. Create a new secret and set these Vercel environment variables for the
   intended deployment environments:

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | Your actual HTTPS project URL |
   | `SUPABASE_SECRET_KEY` | The newly issued backend-only secret |

4. Delete the obsolete `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` entries. Redeploy after changing environment
   settings. Do not paste secrets into chat, issues, or pull requests.
5. Check visible reviews, a controlled review submission, and address search.
   Confirm anonymous direct table access is denied and no privileged key is
   present in current browser assets. Old immutable assets may remain cached;
   revocation is what invalidates their exposed key.

## Behavior until setup is complete

Café browsing, static pages, and the map remain available. Review reads report
unavailability if the backend is unconfigured. Review submission and address
geocoding return 503 when credentials or the shared limiter are unavailable;
they never silently fall back to an unprotected database or upstream request.

The shared database gate allows five review submissions per IP per minute and
one geocoding admission per second for the whole deployment. Rejected requests
return 429 with Retry-After. This does not replace hosting firewall protections
against volumetric traffic or monitoring of usage/spend.

## Validation

`npm run coverage`, `npm run lint`, `npx tsc --noEmit`,
`npm run validate:data`, and `npm run build` are the repository checks.
The build's postbuild step scans client assets for privileged credentials.
The migration was exercised against a local PostgreSQL-compatible PGlite
fixture for repeatability, role/column privilege denial, service-role inserts,
quota enforcement, and expiry. Live project policies and key revocation still
require owner access.
