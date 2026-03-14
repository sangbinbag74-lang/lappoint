import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        background: '#f9fafb',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* 배경 레드 스트라이프 */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '6px',
        background: '#FF2800',
      }} />

      {/* 로고 영역 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <div style={{
          background: '#FF2800',
          width: '72px',
          height: '72px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ color: 'white', fontSize: 50, fontWeight: 900 }}>L</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0px' }}>
          <span style={{ color: '#FF2800', fontSize: 64, fontWeight: 900, letterSpacing: '-2px' }}>LAP</span>
          <span style={{ color: '#111827', fontSize: 64, fontWeight: 900, letterSpacing: '-2px' }}>POINT</span>
        </div>
      </div>

      {/* 태그라인 */}
      <div style={{
        fontSize: 28,
        color: '#6b7280',
        marginBottom: '48px',
        textAlign: 'center',
      }}>
        F1 그랑프리 결과를 예측하고 포인트를 획득하세요
      </div>

      {/* 카드 3개 */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {[
          { icon: '🏁', label: '레이스 예측' },
          { icon: '🏆', label: '랭킹 경쟁' },
          { icon: '💰', label: '포인트 획득' },
        ].map(({ icon, label }) => (
          <div
            key={label}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '14px',
              padding: '18px 32px',
              fontSize: 22,
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <span>{icon}</span>
            <span style={{ fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* 하단 레드 스트라이프 */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '6px',
        background: '#FF2800',
      }} />
    </div>,
    { ...size }
  )
}
