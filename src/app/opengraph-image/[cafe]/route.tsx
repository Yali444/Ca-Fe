import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cafe: string }> }
) {
  try {
    const { cafe } = await params;
    
    // Fetch cafes data from public URL
    const cafesUrl = new URL('/data/cafes.json', request.url);
    const cafesResponse = await fetch(cafesUrl);
    
    if (!cafesResponse.ok) {
      return new Response('Failed to fetch cafes data', { status: 500 });
    }
    
    type CafeRecord = {
      id: string;
      name?: string;
      location?: string;
      description?: string;
      vibeTags?: string[];
    };
    const cafes = (await cafesResponse.json()) as CafeRecord[];

    // Find the specific cafe
    const cafeData = cafes.find((c) => c.id === cafe);
    
    if (!cafeData) {
      return new Response('Cafe not found', { status: 404 });
    }

    const cafeName = cafeData.name || 'Unknown Cafe';
    const cafeLocation = cafeData.location || '';
    const cafeDescription = cafeData.description || '';
    const vibeTags = cafeData.vibeTags?.slice(0, 3) || [];
    
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
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
          
          {/* Location */}
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
              📍 {cafeLocation}
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
              {cafeDescription.length > 120 
                ? `${cafeDescription.substring(0, 120)}...` 
                : cafeDescription}
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
            Israel Specialty Coffee Guide
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}
