# Migration Notes: Matcha Data from TS to JSON

## Current State
- Matcha data is loaded from `src/data/matcha.ts` (TypeScript file)
- Coffee data is loaded from `public/data/cafes.json` (JSON file)

## After Migration to JSON
When matcha data is moved to JSON (e.g., `public/data/matcha.json`), update the following:

### 1. Update `src/hooks/usePlaceData.ts`
Change the matcha loading section (around line 142):

**Before:**
```typescript
const { MATCHA_PLACES } = await import("@/data/matcha");
```

**After:**
```typescript
// Fetch matcha data from JSON file (similar to cafes.json)
const response = await fetch("/data/matcha.json");
if (!response.ok) {
  throw new Error(`Failed to fetch matcha data: ${response.statusText}`);
}
const matchaRaw = await response.json();
// Transform raw JSON to MatchaPlace format if needed
const MATCHA_PLACES = matchaRaw.map(normalizeMatchaPlace);
```

### 2. JSON Structure
Ensure the JSON structure matches what `normalizeMatchaPlace` expects:
- `name`, `city`, `address`, `openingHours`, `description`
- `vibeTags` (array)
- `instagramHandle`, `website`
- `coordinates: { lat, lng }` or `latitude`, `longitude`
- `heroImage`

### 3. Files That May Need Updates
- `src/hooks/usePlaceData.ts` - Main loading logic
- `src/data/matcha-only-places.ts` - Should still work (uses name+city keys)
- `src/components/IsraelCoffeeGuide.tsx` - Should still work (uses normalized Place type)

### 4. Testing Checklist
- [ ] Matcha places load correctly
- [ ] Matcha-only places show green icons
- [ ] Coffee+Matcha places show coffee icons
- [ ] Deduplication logic works correctly
- [ ] No TypeScript errors

### 5. Optional: Remove Old File
After confirming everything works:
- [ ] Remove `src/data/matcha.ts` (if no longer needed)
- [ ] Update any imports that reference it
