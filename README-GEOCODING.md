# Improving Cafe Coordinates Accuracy

This guide explains how to improve the accuracy of cafe coordinates in the app.

## Method 1: Google Geocoding API (Recommended - Most Accurate)

### Setup:
1. Get a free Google Maps API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable "Geocoding API"
   - Create credentials (API Key)
   - Restrict the key to "Geocoding API" for security

2. Add to `.env.local`:
   ```
   GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

3. Install dependencies:
   ```bash
   npm install axios
   ```

4. Run the geocoding script:
   ```bash
   npx tsx scripts/geocode-addresses.ts --google
   ```

5. Review `geocoding-results.json` and update coordinates manually in the data files.

**Cost**: Free tier: $200/month credit (40,000 geocoding requests/month)

---

## Method 2: Nominatim (Free, Less Accurate)

1. Run without API key:
   ```bash
   npx tsx scripts/geocode-addresses.ts
   ```

2. Review results and manually verify in Google Maps.

**Limitations**: 
- Rate limit: 1 request/second
- Less accurate for Hebrew addresses
- May need manual corrections

---

## Method 3: Manual Verification Tool

1. Open `scripts/verify-coordinates.html` in your browser.

2. Paste your cafe data into the script (see comment in HTML file).

3. Click on cafes in the list to see their current coordinates.

4. Click on the map to update marker position.

5. Copy the new coordinates and update your data files.

**Advantages**: 
- Full control
- Visual verification
- No API costs

---

## Method 4: Google Maps Manual Method

For each cafe:

1. Search the address in Google Maps
2. Right-click on the exact location
3. Copy the coordinates
4. Update in `roasteries.ts` or `matcha.ts`

**Format**: 
```typescript
coordinates: { lat: 32.080681, lng: 34.799844 }
```

---

## Updating Coordinates

After getting accurate coordinates:

1. Open `src/data/roasteries.ts` or `src/data/matcha.ts`
2. Find the cafe entry
3. Update the `coordinates` field:
   ```typescript
   coordinates: { lat: NEW_LAT, lng: NEW_LNG }
   ```
4. Save and test in the app

---

## Tips for Accuracy

- **Use rooftop-level accuracy**: Google's "ROOFTOP" location_type is most accurate
- **Verify visually**: Always check the marker position on the map after updating
- **Test navigation**: Use the "Navigate" button to ensure coordinates lead to the right place
- **Update in batches**: Process cafes by city to maintain context

---

## Current Status

Check coordinate accuracy by:
- Opening the map in the app
- Clicking on markers
- Verifying the popup shows correct location
- Testing navigation to the address

If coordinates are off by more than ~50 meters, consider updating them.








