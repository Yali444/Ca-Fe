# Opinly blog

Configured for Ca Fe at https://www.ca-fe.xyz/blog (NEXT_PUBLIC_SITE_URL overrides the origin).
Images use /opinly-images and rewrite to https://cdn.opinly.ai/B7y3HsjKwaFGGiRJdqV9v.

## Activate

1. Set OPINLY_API_KEY privately in .env.local or the hosting environment. Do not use a NEXT_PUBLIC prefix or next.config.env.
2. In Opinly Settings → Developers, add https://www.ca-fe.xyz/api/opinly and subscribe to content.routes-changed.
3. Set OPINLY_WEBHOOK_SIGNING_SECRET privately to the endpoint's Svix signing secret.
4. Redeploy after setting the variables. Publish a post, then send a test webhook from Opinly.
5. Check /blog, its post/canonical/JSON-LD, /sitemap.xml, and that editing/deleting a published post updates the next request.
6. Check Analytics → Customers → Visitors for the pixel; aggregated traffic is not instantaneous.

Without an API key the blog index shows a coming-soon page and the existing sitemap stays available. API failures with a configured key propagate, rather than returning a successful empty blog. Authentication/content delivery and pixel receipt need verification against the live Opinly account after activation.

## Cache and security

GET SDK requests use force-cache with the opinly tag; analytics POSTs use no-store. Verified webhooks call revalidateTag('opinly', { expire: 0 }) and revalidatePath on changed routes, the catch-all (including paginated archives), index and sitemap. Invalid signatures/payloads do not invalidate anything. Repeated valid deliveries are safe.

JSON-LD uses Opinly's builders with HTML-safe serialization. The CSP permits only the Opinly script/collection origin and the provided image namespace in addition to the existing origins.

## Analytics coverage

The root layout loads the supplied next/script pixel once. Opinly automatically records page views (including SPA navigation), clicks, form submissions, and recognition of email fields. SDK helpers queue early events.

The guide sends view_item when a cafe detail opens, search after a settled search (result count only, since queries may contain private addresses), and review_submitted after a successful review save. Review content and reviewer names are not sent as event properties. Blog and sidebar links are captured automatically.

Ca Fe currently has no authentication, shopping cart, checkout, or lead-submission backend. No fictitious signup/lead/purchase conversions are emitted.

When those flows exist:
- Call identifyOpinlyUser({ email, id }) from src/lib/opinly/browser.ts after verified authentication. Fire login after login and sign_up only on actual account creation. Opinly's first-identity-wins behavior means it cannot switch identities on a shared browser.
- Fire standard events through trackOpinly only after the corresponding action succeeds (generate_lead, add_to_cart, begin_checkout, etc.).
- At checkout, persist getOpinlyAnonId() on the order before redirecting to payment.
- In a signature-verified payment webhook, await recordOpinlyPurchase from src/lib/opinly/purchases.ts with orderId, value (major units), currency and anonId/email. Use trusted stored totals, never browser-supplied prices. Failed delivery should cause a retry; orderId deduplicates retries.
- If also sending a browser purchase, use exactly the same orderId as externalEventId.

Documentation: https://opinly.ai/llms-full.txt
