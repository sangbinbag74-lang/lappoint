import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#FF2800',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '7px',
      }}
    >
      <span style={{ color: 'white', fontSize: 20, fontWeight: 900, fontFamily: 'sans-serif' }}>
        L
      </span>
    </div>,
    { ...size }
  )
}
