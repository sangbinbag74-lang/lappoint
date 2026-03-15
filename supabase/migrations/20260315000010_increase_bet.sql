-- increase_bet: 배팅 금액 증액 (현재 금액보다 높은 값으로만 가능)
CREATE OR REPLACE FUNCTION public.increase_bet(
  p_user_id uuid,
  p_bet_id   uuid,
  p_new_amount integer
)
RETURNS jsonb AS $$
DECLARE
  v_current_amount integer;
  v_balance        integer;
  v_diff           integer;
  v_new_fee        integer;
BEGIN
  -- 현재 배팅 조회 (본인 소유 확인)
  SELECT bet_amount INTO v_current_amount
  FROM public.bets
  WHERE id = p_bet_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_current_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'BET_NOT_FOUND');
  END IF;

  IF p_new_amount <= v_current_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'AMOUNT_MUST_INCREASE');
  END IF;

  v_diff := p_new_amount - v_current_amount;

  -- 잔액 확인
  SELECT point_balance INTO v_balance
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance < v_diff THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
  END IF;

  v_new_fee := FLOOR(p_new_amount * 0.1);

  -- 잔액 차감 + 배팅 업데이트
  UPDATE public.users
  SET point_balance = point_balance - v_diff
  WHERE id = p_user_id;

  UPDATE public.bets
  SET bet_amount = p_new_amount, fee_amount = v_new_fee
  WHERE id = p_bet_id;

  INSERT INTO public.point_logs (user_id, action_type, amount, description)
  VALUES (p_user_id, 'bet', -v_diff, '배팅 증액: +' || v_diff || 'P (' || p_new_amount || 'P)');

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_balance - v_diff,
    'new_amount', p_new_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
