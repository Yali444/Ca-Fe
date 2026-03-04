import { ImageResponse } from 'next/og';

export const alt = 'Israel Specialty Coffee Guide - Discover the best specialty coffee shops in Israel';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(to bottom, #1a1a1a, #2d2d2d)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 64,
            marginBottom: 32,
            fontWeight: 'bold',
          }}
        >
          ☕
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Israel Specialty Coffee Guide
        </div>
        <div
          style={{
            fontSize: 32,
            opacity: 0.8,
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          Discover the best specialty coffee shops in Israel
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

