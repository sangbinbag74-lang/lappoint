-- ============================================================
-- LapPoint Phase 3 - 정산 시스템
-- Supabase SQL Editor에서 이 전체 스크립트를 실행하세요.
-- ============================================================

-- 1. predictions 테이블에 is_settled 컬럼 추가
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS is_settled boolean NOT NULL DEFAULT false;

-- ============================================================
-- RPC 함수: 파리뮈튀엘 정산 (Parimutuel Settlement)
--
-- 정산 흐름:
--   1. 중복 정산 방지 (is_settled 체크)
--   2. Total Pool = 해당 예측의 전체 배팅 합계
--   3. Net Pool = FLOOR(Total Pool * 0.9)  — 10% 플랫폼 수수료 제외
--   4. Winning Pool = 정답 선택지에 배팅된 금액 합계
--   5. 정답자 없음 → Net Pool 플랫폼 귀속 후 정산 완료
--      (이월이 필요하다면 별도 pool_balance 테이블 구현 필요)
--   6. 각 승리 유저 payout = FLOOR(user_bet / Winning Pool * Net Pool)
--   7. FLOOR 버림 나머지 → 가장 먼저 배팅한 유저에게 귀속
--   8. point_logs에 win_payout 기록
--   9. predictions.correct_option + is_settled = true 저장
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
  -- (이월 구현 시: pool_balance 테이블에 v_net_pool 적립)
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
    SELECT user_id, bet_amount
    FROM public.bets
    WHERE prediction_id = p_prediction_id
      AND selected_option = p_winning_option
    ORDER BY created_at ASC
  LOOP
    v_payout := FLOOR(bet_rec.bet_amount::numeric / v_winning_pool * v_net_pool);

    -- 첫 번째 승자 기록 (나머지 귀속용)
    IF v_first_winner_id IS NULL THEN
      v_first_winner_id := bet_rec.user_id;
    END IF;

    -- 잔액 지급
    UPDATE public.users
    SET point_balance = point_balance + v_payout
    WHERE id = bet_rec.user_id;

    -- 지급 로그
    INSERT INTO public.point_logs (user_id, action_type, amount, description)
    VALUES (
      bet_rec.user_id,
      'win_payout',
      v_payout,
      '정산 지급: ' || p_winning_option || ' (' || v_payout || 'P)'
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
-- 완료! 이제 Next.js에서 supabase.rpc('settle_prediction', {...})로 호출하세요.
-- ============================================================
