import { ImageResponse } from 'next/og';

export const alt = 'Israel Specialty Coffee Guide - Discover the best specialty coffee shops in Israel';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export async function GET() {
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
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 25%, #1e40af 50%, #2563eb 75%, #3b82f6 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
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
              width: 120,
              height: 120,
              backgroundColor: '#ffffff',
              borderRadius: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 30,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: 70,
                color: '#0f172a',
              }}
            >
              ☕
            </div>
          </div>

          <div
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: 20,
              lineHeight: 1.2,
            }}
          >
            Israel Specialty
            <br />
            Coffee Guide
          </div>

          <div
            style={{
              fontSize: 28,
              color: '#e0f2fe',
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            Discover the best specialty coffee shops across Israel
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
