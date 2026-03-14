import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 세션 쿠키를 응답에 전달하기 위해 response 객체 먼저 생성
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser()는 서버에서 JWT를 검증하므로 안전
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const adminEmail = process.env.ADMIN_EMAIL

  // 관리자 이메일 미설정 또는 미인증 또는 이메일 불일치 → 메인으로 리디렉트
  if (!user || !adminEmail || user.email !== adminEmail) {
    const redirectUrl = new URL('/', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

// /admin 하위 모든 경로에 미들웨어 적용
export const config = {
  matcher: ['/admin/:path*'],
}
