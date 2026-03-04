# Fonts Directory

Place your custom font files here.

## Required Font Files

### TimeBurner (for English text)
- `TimeBurner-Regular.woff2` - Regular weight (400)
- `TimeBurner-Bold.woff2` - Bold weight (700)

### Yehuda (יהודה) (for Hebrew text)
- `Yehuda-Regular.woff2` - Regular weight (400)
- `Yehuda-Bold.woff2` - Bold weight (700)

## How to Add Font Files

### Option 1: Using Next.js localFont (Recommended)

1. **Get your font files** - Make sure you have the font files in `.woff2` format
   - If you have `.ttf` or `.otf` files, convert them using:
     - https://cloudconvert.com/ttf-to-woff2
     - https://convertio.co/ttf-woff2/

2. **Rename the files** to match the exact names above

3. **Place the files** in this directory (`public/fonts/`)

4. **Uncomment the font loading code**:
   - Open `src/lib/fonts.ts`
   - Uncomment the `localFont` imports and exports
   - Comment out the temporary exports at the bottom

5. **Restart the development server**

### Option 2: Using CSS @font-face

1. **Add your font files** to this directory with the names above

2. **Uncomment the @font-face declarations** in `src/app/globals.css`

3. **Restart the development server**

## Current Status

The website is currently using system fonts as fallback. Once you add the font files and uncomment the code, the custom fonts will be used automatically.

## Alternative Font Formats

If you only have `.woff`, `.ttf`, or `.otf` files:
- For `localFont`: Update the file extensions in `src/lib/fonts.ts`
- For `@font-face`: Update the `format()` values in `src/app/globals.css` (use `"woff"`, `"truetype"`, or `"opentype"`)

## Font Loading

- **Next.js localFont**: Optimizes font loading and prevents layout shift (recommended)
- **CSS @font-face**: More traditional approach, works with any font format

