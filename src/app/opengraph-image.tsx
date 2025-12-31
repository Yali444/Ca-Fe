import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'Israel Specialty Coffee Guide';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0ea5e9',
          backgroundImage: 'linear-gradient(to bottom right, #0ea5e9, #0284c7, #075985)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Main title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0 0 20px 0',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
              letterSpacing: '-0.02em',
            }}
          >
            Israel Specialty
          </h1>
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0 0 40px 0',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
              letterSpacing: '-0.02em',
            }}
          >
            Coffee Guide
          </h1>
          <p
            style={{
              fontSize: '32px',
              color: '#e0f2fe',
              margin: '0',
              maxWidth: '900px',
              lineHeight: '1.4',
              textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            Discover the best specialty coffee shops and roasteries across Israel
          </p>
        </div>

        {/* Coffee icon decoration */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '40px',
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              opacity: 0.9,
            }}
          >
            ☕
          </div>
          <div
            style={{
              fontSize: '48px',
              opacity: 0.9,
            }}
          >
            🇮🇱
          </div>
          <div
            style={{
              fontSize: '48px',
              opacity: 0.9,
            }}
          >
            ☕
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

