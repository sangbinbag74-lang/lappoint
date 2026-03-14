-- ============================================================
-- LapPoint Phase 4 - 리더보드 & 마이페이지 고도화
-- Supabase SQL Editor에서 이 전체 스크립트를 실행하세요.
-- ============================================================

-- 1. point_logs에 bet_id FK 추가 (배당금 ↔ 배팅 1:1 추적)
ALTER TABLE public.point_logs
  ADD COLUMN IF NOT EXISTS bet_id uuid REFERENCES public.bets(id) ON DELETE SET NULL;

-- ============================================================
-- 2. settle_prediction RPC 업데이트 — bet_id 기록 포함
-- ============================================================
CREATE OR REPLACE FUNCTION public.settle_prediction(
  p_prediction_id uuid,
  p_winning_option text
)
RETURNS jsonb AS $$
DECLARE
  v_total_pool      integer;
  v_net_pool        integer;
  v_winning_pool    integer;
  v_winner_count    bigint;
  v_distributed     integer := 0;
  v_payout          integer;
  v_remainder       integer;
  v_first_winner_id uuid;
  v_first_bet_id    uuid;
  v_last_log_id     uuid;
  bet_rec           RECORD;
BEGIN
  -- 중복 정산 방지
  IF EXISTS (
    SELECT 1 FROM public.predictions
    WHERE id = p_prediction_id AND is_settled = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_SETTLED');
  END IF;

  -- 해당 prediction이 존재하는지 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.predictions WHERE id = p_prediction_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'PREDICTION_NOT_FOUND');
  END IF;

  -- 전체 배팅 풀 계산
  SELECT COALESCE(SUM(bet_amount), 0) INTO v_total_pool
  FROM public.bets
  WHERE prediction_id = p_prediction_id;

  -- 배팅 없음 → 바로 정산 완료
  IF v_total_pool = 0 THEN
    UPDATE public.predictions
    SET correct_option = p_winning_option, is_settled = true
    WHERE id = p_prediction_id;
    RETURN jsonb_build_object(
      'success', true, 'message', 'NO_BETS',
      'total_pool', 0, 'net_pool', 0, 'winner_count', 0
    );
  END IF;

  -- 순수 배당금 (10% 수수료 제외, 소수점 버림)
  v_net_pool := FLOOR(v_total_pool * 0.9);

  -- 승리 풀 및 승자 수
  SELECT COALESCE(SUM(bet_amount), 0), COUNT(*)
  INTO v_winning_pool, v_winner_count
  FROM public.bets
  WHERE prediction_id = p_prediction_id
    AND selected_option = p_winning_option;

  -- 정답자 없음 → Net Pool 플랫폼 귀속, 정산 완료
  IF v_winner_count = 0 THEN
    UPDATE public.predictions
    SET correct_option = p_winning_option, is_settled = true
    WHERE id = p_prediction_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'NO_WINNERS_POOL_ABSORBED',
      'total_pool', v_total_pool,
      'net_pool', v_net_pool,
      'winner_count', 0
    );
  END IF;

  -- 비례 배당 지급 (배팅 시각 오름차순, 첫 번째 배팅자에게 나머지 귀속)
  FOR bet_rec IN
    SELECT id, user_id, bet_amount
    FROM public.bets
    WHERE prediction_id = p_prediction_id
      AND selected_option = p_winning_option
    ORDER BY created_at ASC
  LOOP
    v_payout := FLOOR(bet_rec.bet_amount::numeric / v_winning_pool * v_net_pool);

    -- 첫 번째 승자 기록 (나머지 귀속용)
    IF v_first_winner_id IS NULL THEN
      v_first_winner_id := bet_rec.user_id;
      v_first_bet_id    := bet_rec.id;
    END IF;

    -- 잔액 지급
    UPDATE public.users
    SET point_balance = point_balance + v_payout
    WHERE id = bet_rec.user_id;

    -- 지급 로그 (bet_id 포함)
    INSERT INTO public.point_logs (user_id, action_type, amount, description, bet_id)
    VALUES (
      bet_rec.user_id,
      'win_payout',
      v_payout,
      '정산 지급: ' || p_winning_option || ' (' || v_payout || 'P)',
      bet_rec.id
    )
    RETURNING id INTO v_last_log_id;

    v_distributed := v_distributed + v_payout;
  END LOOP;

  -- 소수점 버림으로 발생한 나머지 → 첫 번째 배팅자에게 귀속
  v_remainder := v_net_pool - v_distributed;
  IF v_remainder > 0 AND v_first_winner_id IS NOT NULL THEN
    UPDATE public.users
    SET point_balance = point_balance + v_remainder
    WHERE id = v_first_winner_id;

    -- 첫 번째 배팅자의 마지막 win_payout 로그에 나머지 합산
    UPDATE public.point_logs
    SET amount = amount + v_remainder,
        description = description || ' (+나머지 ' || v_remainder || 'P)'
    WHERE id = (
      SELECT id FROM public.point_logs
      WHERE user_id = v_first_winner_id
        AND action_type = 'win_payout'
        AND bet_id = v_first_bet_id
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  -- 정산 완료 표시
  UPDATE public.predictions
  SET correct_option = p_winning_option, is_settled = true
  WHERE id = p_prediction_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_pool', v_total_pool,
    'net_pool', v_net_pool,
    'winner_count', v_winner_count,
    'distributed', v_distributed + v_remainder
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. 적중률 랭킹 View
--    hit_rate: 정산된 배팅 중 적중 비율(%)
--    총 배팅 5회 미만이면 hit_rate = NULL (랭킹 제외)
-- ============================================================
CREATE OR REPLACE VIEW public.user_hit_rates AS
SELECT
  u.id,
  u.nickname,
  u.point_balance,
  COUNT(b.id)::integer                                                       AS total_bets,
  COUNT(CASE WHEN p.is_settled = true AND p.correct_option = b.selected_option THEN 1 END)::integer AS win_count,
  COUNT(CASE WHEN p.is_settled = true THEN 1 END)::integer                  AS settled_count,
  CASE
    WHEN COUNT(b.id) >= 5
    THEN ROUND(
      COUNT(CASE WHEN p.is_settled = true AND p.correct_option = b.selected_option THEN 1 END)::numeric
      / NULLIF(COUNT(CASE WHEN p.is_settled = true THEN 1 END), 0) * 100,
      1
    )
    ELSE NULL
  END AS hit_rate
FROM public.users u
LEFT JOIN public.bets b ON b.user_id = u.id
LEFT JOIN public.predictions p ON p.id = b.prediction_id
GROUP BY u.id, u.nickname, u.point_balance;

-- ============================================================
-- 완료! 실행 순서:
--   1. 이 스크립트 전체 실행
--   2. SELECT * FROM user_hit_rates LIMIT 5; 로 View 확인
--   3. npm run dev → /leaderboard 접속 확인
-- ============================================================
