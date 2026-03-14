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
      }}
    >
      <span style={{ color: '#FF2800', fontSize: 28, fontWeight: 900, fontFamily: 'sans-serif' }}>
        L
      </span>
    </div>,
    { ...size }
  )
}
