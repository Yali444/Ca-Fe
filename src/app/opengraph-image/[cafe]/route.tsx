import { ImageResponse } from 'next/og';
import bidiFactory from 'bidi-js';

import { findCafeMeta } from '@/lib/cafe-lookup';

// Deliberately NOT `runtime = 'edge'`. Edge cannot use the build-time dataset
// import, which forced this route to HTTP-fetch and linear-scan the whole
// ~182 KB cafes.json on every single card render. Node route handlers render
// ImageResponse fine, and findCafeMeta already has the data in memory.

// Satori (next/og) does not implement the Unicode bidi algorithm, so Hebrew is
// laid out left-to-right and every word comes out reversed. Pre-reorder each
// string into its visual order here; numbers and any embedded Latin keep their
// own direction. Created once at module load.
const bidi = bidiFactory();
function toVisual(text: string): string {
  if (!text) return text;
  const levels = bidi.getEmbeddingLevels(text, 'rtl');
  return bidi.getReorderedString(text, levels);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cafe: string }> }
) {
  try {
    const { cafe } = await params;
    
    const cafeData = findCafeMeta(cafe);

    if (!cafeData) {
      return new Response('Cafe not found', { status: 404 });
    }

    const cafeName = toVisual(cafeData.name || 'Unknown Cafe');
    const cafeLocation = toVisual(cafeData.location || '');
    const rawDescription = cafeData.description || '';
    const cafeDescription = toVisual(
      rawDescription.length > 120 ? `${rawDescription.substring(0, 120)}...` : rawDescription
    );
    const vibeTags = (cafeData.vibeTags?.slice(0, 3) || []).map(toVisual);

    // Load the site's Hebrew font (Aran) so Hebrew names/locations render as
    // real text rather than tofu boxes. Satori accepts WOFF (not WOFF2). If the
    // fetch fails, fall back to the built-in fonts.
    let fonts:
      | { name: string; data: ArrayBuffer; style: 'normal'; weight: 400 }[]
      | undefined;
    try {
      const fontData = await fetch(
        new URL('/fonts/os_aran_400ffc-webfont.woff', request.url)
      ).then((r) =>
        r.ok ? r.arrayBuffer() : Promise.reject(new Error('font fetch failed'))
      );
      fonts = [{ name: 'Aran', data: fontData, style: 'normal', weight: 400 }];
    } catch {
      fonts = undefined;
    }

    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 128,
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #3a3a3a 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'Aran, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '60px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              opacity: 0.1,
            }}
          />
          
          {/* Coffee icon */}
          <div
            style={{
              fontSize: 72,
              marginBottom: 24,
              fontWeight: 'bold',
              textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 1,
            }}
          >
            ☕
          </div>
          
          {/* Cafe name */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 16,
              textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 1,
              lineHeight: 1.2,
            }}
          >
            {cafeName}
          </div>
          
          {/* Location — single text child so Satori doesn't require display:flex */}
          {cafeLocation && (
            <div
              style={{
                fontSize: 32,
                opacity: 0.9,
                textAlign: 'center',
                marginBottom: 20,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                zIndex: 1,
              }}
            >
              {`📍 ${cafeLocation}`}
            </div>
          )}
          
          {/* Vibe tags */}
          {vibeTags.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: 24,
                flexWrap: 'wrap',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              {vibeTags.map((tag: string, index: number) => (
                <div
                  key={index}
                  style={{
                    fontSize: 20,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
          
          {/* Description (truncated) */}
          {cafeDescription && (
            <div
              style={{
                fontSize: 22,
                opacity: 0.8,
                textAlign: 'center',
                maxWidth: 900,
                lineHeight: 1.4,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                zIndex: 1,
              }}
            >
              {cafeDescription}
            </div>
          )}
          
          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              fontSize: 24,
              opacity: 0.7,
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            Ca-Fe
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        ...(fonts ? { fonts } : {}),
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}
