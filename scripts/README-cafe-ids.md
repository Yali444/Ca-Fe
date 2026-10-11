# Stable café IDs

Every `/cafe/N` URL is a public permalink. **Never renumber the array or reuse an old ID.**

`scripts/cafe-id-registry.json` reserves each numeric ID for its café name and city. `npm run validate:data` checks that no previously published ID has silently been assigned to another café, that IDs are unique, and that new IDs are registered.

- **Add a café:** Allocate a fresh, never-used ID (higher than any ID in the registry), then add its name and city to the registry.
- **Rename or relocate:** Keep the ID. Update the associated name/city in the registry in the *same reviewed change*, verifying it is genuinely the same business.
- **Remove/close a café:** Keep the ID reserved in the registry even if the listing is removed. Never recycle it.
- **Unrelated new business at the same address:** Allocate a new ID.

This registry does not prove external URLs are reachable. Maintain a separate link audit for that.

As of 2026-10-11: `/cafe/104` has represented קפה פקטורי 54 and `/cafe/137` has represented פוגזי since at least June 2026; the opposite claim in the agent report was incorrect.
