-- Phase 3: predictions.is_settled 컬럼 + settle_prediction RPC

ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS is_settled boolean NOT NULL DEFAULT false;

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
  IF EXISTS (
    SELECT 1 FROM public.predictions
    WHERE id = p_prediction_id AND is_settled = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_SETTLED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.predictions WHERE id = p_prediction_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'PREDICTION_NOT_FOUND');
  END IF;

  SELECT COALESCE(SUM(bet_amount), 0) INTO v_total_pool
  FROM public.bets
  WHERE prediction_id = p_prediction_id;

  IF v_total_pool = 0 THEN
    UPDATE public.predictions
    SET correct_option = p_winning_option, is_settled = true
    WHERE id = p_prediction_id;
    RETURN jsonb_build_object(
      'success', true, 'message', 'NO_BETS',
      'total_pool', 0, 'net_pool', 0, 'winner_count', 0
    );
  END IF;

  v_net_pool := FLOOR(v_total_pool * 0.9);

  SELECT COALESCE(SUM(bet_amount), 0), COUNT(*)
  INTO v_winning_pool, v_winner_count
  FROM public.bets
  WHERE prediction_id = p_prediction_id
    AND selected_option = p_winning_option;

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

  FOR bet_rec IN
    SELECT user_id, bet_amount
    FROM public.bets
    WHERE prediction_id = p_prediction_id
      AND selected_option = p_winning_option
    ORDER BY created_at ASC
  LOOP
    v_payout := FLOOR(bet_rec.bet_amount::numeric / v_winning_pool * v_net_pool);

    IF v_first_winner_id IS NULL THEN
      v_first_winner_id := bet_rec.user_id;
    END IF;

    UPDATE public.users
    SET point_balance = point_balance + v_payout
    WHERE id = bet_rec.user_id;

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

  v_remainder := v_net_pool - v_distributed;
  IF v_remainder > 0 AND v_first_winner_id IS NOT NULL THEN
    UPDATE public.users
    SET point_balance = point_balance + v_remainder
    WHERE id = v_first_winner_id;

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
