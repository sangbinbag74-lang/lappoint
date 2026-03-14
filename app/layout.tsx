import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

const siteUrl = 'https://lappoint.xyz'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'LapPoint - F1 승부 예측',
  description: 'F1 그랑프리 결과를 예측하고 포인트를 획득하세요. 가입 즉시 1,000P 지급!',
  openGraph: {
    title: 'LapPoint - F1 승부 예측',
    description: 'F1 그랑프리 결과를 예측하고 포인트를 획득하세요. 가입 즉시 1,000P 지급!',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LapPoint - F1 승부 예측',
    description: 'F1 그랑프리 결과를 예측하고 포인트를 획득하세요.',
  },
  other: {
    'google-adsense-account': 'ca-pub-4638182627010286',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
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
