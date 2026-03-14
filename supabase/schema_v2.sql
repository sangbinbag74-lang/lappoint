-- ============================================================
-- LapPoint Phase 2 - DB 스키마 확장
-- Supabase SQL Editor에서 이 전체 스크립트를 실행하세요.
-- ============================================================

-- 1. races 테이블
CREATE TABLE IF NOT EXISTS public.races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  race_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. predictions 테이블
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,          -- 예: ["Yes", "No"] 또는 ["버스타펜", "노리스", "르클레르"]
  correct_option text,             -- 경기 완료 후 관리자가 입력
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. bets 테이블
CREATE TABLE IF NOT EXISTS public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prediction_id uuid NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  selected_option text NOT NULL,
  bet_amount integer NOT NULL CHECK (bet_amount > 0),
  fee_amount integer NOT NULL,     -- bet_amount * 10% (소수점 버림)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, prediction_id)  -- 한 예측에 유저당 1회만 배팅
);

-- 4. point_logs 테이블 (포인트 변동 감사 로그)
CREATE TABLE IF NOT EXISTS public.point_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type text NOT NULL
    CHECK (action_type IN ('signup', 'attendance', 'bet', 'win_payout')),
  amount integer NOT NULL,         -- 양수: 획득, 음수: 차감
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS 정책
-- ============================================================

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;

-- 경기/예측 항목: 누구나 읽기 가능
CREATE POLICY "races public read"
  ON public.races FOR SELECT USING (true);

CREATE POLICY "predictions public read"
  ON public.predictions FOR SELECT USING (true);

-- 배팅/포인트 로그: 본인만 조회
CREATE POLICY "bets own read"
  ON public.bets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "point_logs own read"
  ON public.point_logs FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- RPC 함수 1: 배팅 (원자적 트랜잭션 + FOR UPDATE 행 잠금)
-- ============================================================

CREATE OR REPLACE FUNCTION public.place_bet(
  p_user_id uuid,
  p_prediction_id uuid,
  p_selected_option text,
  p_bet_amount integer
)
RETURNS jsonb AS $$
DECLARE
  v_balance integer;
  v_fee integer;
BEGIN
  -- 잔액 조회 + 행 잠금 (동시 중복 배팅 방지)
  SELECT point_balance INTO v_balance
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  IF v_balance < p_bet_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
  END IF;

  -- 수수료 계산 (10%, 소수점 버림)
  v_fee := FLOOR(p_bet_amount * 0.1);

  -- 잔액 차감
  UPDATE public.users
  SET point_balance = point_balance - p_bet_amount
  WHERE id = p_user_id;

  -- 배팅 기록
  INSERT INTO public.bets (user_id, prediction_id, selected_option, bet_amount, fee_amount)
  VALUES (p_user_id, p_prediction_id, p_selected_option, p_bet_amount, v_fee);

  -- 포인트 로그 기록
  INSERT INTO public.point_logs (user_id, action_type, amount, description)
  VALUES (p_user_id, 'bet', -p_bet_amount, '배팅: ' || p_selected_option);

  RETURN jsonb_build_object(
    'success', true,
    'fee', v_fee,
    'new_balance', v_balance - p_bet_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RPC 함수 2: 출석 체크 (KST 기준, 당일 1회)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_attendance(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_today_kst date;
  v_already_checked boolean;
BEGIN
  -- KST(UTC+9) 기준 오늘 날짜
  v_today_kst := (now() AT TIME ZONE 'Asia/Seoul')::date;

  -- 오늘 출석 기록 중복 확인
  SELECT EXISTS (
    SELECT 1 FROM public.point_logs
    WHERE user_id = p_user_id
      AND action_type = 'attendance'
      AND (created_at AT TIME ZONE 'Asia/Seoul')::date = v_today_kst
  ) INTO v_already_checked;

  IF v_already_checked THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CHECKED');
  END IF;

  -- 100 포인트 지급
  UPDATE public.users
  SET point_balance = point_balance + 100
  WHERE id = p_user_id;

  -- 로그 기록
  INSERT INTO public.point_logs (user_id, action_type, amount, description)
  VALUES (p_user_id, 'attendance', 100, '출석 보상');

  RETURN jsonb_build_object('success', true, 'reward', 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 테스트 데이터 (개발용 - 필요 시 실행)
-- ============================================================
/*
INSERT INTO public.races (name, race_date, status) VALUES
  ('2025 마이애미 그랑프리', '2025-05-04 20:00:00+00', 'upcoming'),
  ('2025 모나코 그랑프리', '2025-05-25 13:00:00+00', 'upcoming');

-- 첫 번째 경기의 예측 항목 추가 (races 테이블에서 실제 id로 교체)
INSERT INTO public.predictions (race_id, question, options) VALUES
  ((SELECT id FROM public.races WHERE name = '2025 마이애미 그랑프리'),
   '페라리가 포디움에 오를까요?', '["Yes", "No"]'),
  ((SELECT id FROM public.races WHERE name = '2025 마이애미 그랑프리'),
   '우승 드라이버는 누구?', '["버스타펜", "노리스", "르클레르", "해밀턴"]');
*/
