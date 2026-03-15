import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = 'https://lappoint.xyz'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'LapPoint — F1 그랑프리 예측 게임',
  description: 'F1 드라이버 우승·폴 포지션·패스티스트 랩 등을 예측하고 포인트를 획득하세요. 가입 즉시 1,000P 지급, 매일 출석 체크 +100P. 2026 시즌 전 경기 참여 가능.',
  openGraph: {
    title: 'LapPoint — F1 그랑프리 예측 게임',
    description: 'F1 드라이버 우승·폴 포지션·패스티스트 랩 등을 예측하고 포인트를 획득하세요. 가입 즉시 1,000P 지급, 매일 출석 체크 +100P.',
    type: 'website',
    locale: 'ko_KR',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'LapPoint — F1 그랑프리 예측 게임' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LapPoint — F1 그랑프리 예측 게임',
    description: 'F1 드라이버 우승·폴 포지션·패스티스트 랩 등을 예측하고 포인트를 획득하세요.',
    images: ['/og-image.jpg'],
  },
  keywords: ['랩포인트', 'LapPoint', 'F1 예측', 'F1 그랑프리 예측', 'F1 포인트 게임', '포뮬러원 예측', 'F1 2026', 'F1 승부 예측'],
  verification: {
    google: '_q4qdoTCPALR4OhQpbZXQV-h_MX2aaC9_wAxew8cSvQ',
  },
  other: {
    'google-adsense-account': 'ca-pub-4638182627010286',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'LapPoint',
      alternateName: ['랩포인트', 'LapPoint F1', '랩 포인트'],
      description: 'F1 그랑프리 예측 게임 — 드라이버 우승, 폴 포지션, 패스티스트 랩 등을 예측하고 포인트를 획득하세요.',
      inLanguage: 'ko',
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: 'LapPoint',
      alternateName: '랩포인트',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/icon.png`,
      },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4638182627010286"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen`}>
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
