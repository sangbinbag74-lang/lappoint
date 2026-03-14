-- ============================================================
-- LapPoint - F1 승부 예측 서비스
-- Supabase SQL Editor에서 이 전체 스크립트를 실행하세요.
-- ============================================================

-- 1. users 테이블 생성
-- (Supabase auth.users와 1:1 연동)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nickname text,
  point_balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Row Level Security (RLS) 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책 설정

-- 모든 유저의 nickname, point_balance는 누구나 조회 가능 (랭킹 기능)
CREATE POLICY "Public leaderboard read"
  ON public.users
  FOR SELECT
  USING (true);

-- 본인 레코드만 수정 가능
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- 4. 신규 유저 가입 시 자동 레코드 생성 + 1,000 포인트 지급 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, nickname, point_balance)
  VALUES (
    NEW.id,
    NEW.email,
    -- Google 계정 이름 사용, 없으면 이메일 앞부분 사용
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    1000  -- 초기 정착금 포인트
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. auth.users에 신규 행 삽입 시 트리거 실행
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- 완료! Supabase Authentication > Providers > Google도 활성화하세요.
-- ============================================================
