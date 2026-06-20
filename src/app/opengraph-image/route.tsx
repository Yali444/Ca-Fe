import { ImageResponse } from 'next/og';
import bidiFactory from 'bidi-js';

export const runtime = 'edge';

export const alt = 'מדריך הקפה של ישראל — בתי קפה וקפה ספיישלטי';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Satori (next/og) does not implement the Unicode bidi algorithm, so Hebrew is
// laid out left-to-right and every word comes out reversed. Pre-reorder each
// string into its visual order here. Created once at module load.
const bidi = bidiFactory();
function toVisual(text: string): string {
  if (!text) return text;
  const levels = bidi.getEmbeddingLevels(text, 'rtl');
  return bidi.getReorderedString(text, levels);
}

export async function GET(request: Request) {
  // Load the site's Hebrew font (Aran) so the Hebrew title/subtitle render as
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

  const title = toVisual('מדריך הקפה של ישראל');
  const subtitle = toVisual('בתי קפה, בתי קלייה וקפה ספיישלטי בכל הארץ');
  const logoSrc = new URL('/images/ca_fe_logo.png', request.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage:
            'linear-gradient(135deg, #0f172a 0%, #1e3a8a 25%, #1e40af 50%, #2563eb 75%, #3b82f6 100%)',
          fontFamily: 'Aran, system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            maxWidth: '1000px',
            margin: '0 40px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
              backgroundColor: '#ffffff',
              borderRadius: '60px',
              marginBottom: 30,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            { /* eslint-disable-next-line @next/next/no-img-element */ }
            <img
              src={logoSrc}
              width={96}
              height={96}
              alt=""
              style={{ objectFit: 'contain' }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 72,
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: 20,
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              color: '#e0f2fe',
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fonts ? { fonts } : {}),
    }
  );
}
