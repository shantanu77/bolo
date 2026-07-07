import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AuraXpress — AI Communication Coach for Professionals'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #581c87 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
          <div
            style={{
              display: 'flex',
              width: 72,
              height: 72,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #4f46e5, #6d28d9)',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 700,
              marginRight: 20,
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>
            Aura<span style={{ color: '#a5b4fc' }}>Xpress</span>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 60, fontWeight: 700, lineHeight: 1.15, maxWidth: 980 }}>
          Speak with clarity and confidence in every professional situation.
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#c7d2fe', marginTop: 28, maxWidth: 900 }}>
          AI-powered communication coaching that listens, scores, and helps you sound like your best professional self.
        </div>
      </div>
    ),
    { ...size }
  )
}
