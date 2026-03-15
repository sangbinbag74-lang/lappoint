import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111111',
        borderRadius: 6,
      }}
    >
      {/* Red accent bar top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: '#FF2800',
        borderRadius: '6px 6px 0 0',
        display: 'flex',
      }} />
      <span style={{
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 900,
        fontFamily: 'sans-serif',
        letterSpacing: -0.5,
        display: 'flex',
      }}>
        L<span style={{ color: '#FF2800' }}>P</span>
      </span>
    </div>,
    { ...size }
  )
}
