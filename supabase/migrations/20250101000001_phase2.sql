-- Phase 2: races/predictions/bets/point_logs 테이블, place_bet/check_attendance RPC

CREATE TABLE IF NOT EXISTS public.races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  race_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_option text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prediction_id uuid NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  selected_option text NOT NULL,
  bet_amount integer NOT NULL CHECK (bet_amount > 0),
  fee_amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, prediction_id)
);

CREATE TABLE IF NOT EXISTS public.point_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type text NOT NULL
    CHECK (action_type IN ('signup', 'attendance', 'bet', 'win_payout')),
  amount integer NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "races public read"
  ON public.races FOR SELECT USING (true);

CREATE POLICY "predictions public read"
  ON public.predictions FOR SELECT USING (true);

CREATE POLICY "bets own read"
  ON public.bets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "point_logs own read"
  ON public.point_logs FOR SELECT USING (auth.uid() = user_id);

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

  v_fee := FLOOR(p_bet_amount * 0.1);

  UPDATE public.users
  SET point_balance = point_balance - p_bet_amount
  WHERE id = p_user_id;

  INSERT INTO public.bets (user_id, prediction_id, selected_option, bet_amount, fee_amount)
  VALUES (p_user_id, p_prediction_id, p_selected_option, p_bet_amount, v_fee);

  INSERT INTO public.point_logs (user_id, action_type, amount, description)
  VALUES (p_user_id, 'bet', -p_bet_amount, '배팅: ' || p_selected_option);

  RETURN jsonb_build_object(
    'success', true,
    'fee', v_fee,
    'new_balance', v_balance - p_bet_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_attendance(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_today_kst date;
  v_already_checked boolean;
BEGIN
  v_today_kst := (now() AT TIME ZONE 'Asia/Seoul')::date;

  SELECT EXISTS (
    SELECT 1 FROM public.point_logs
    WHERE user_id = p_user_id
      AND action_type = 'attendance'
      AND (created_at AT TIME ZONE 'Asia/Seoul')::date = v_today_kst
  ) INTO v_already_checked;

  IF v_already_checked THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CHECKED');
  END IF;

  UPDATE public.users
  SET point_balance = point_balance + 100
  WHERE id = p_user_id;

  INSERT INTO public.point_logs (user_id, action_type, amount, description)
  VALUES (p_user_id, 'attendance', 100, '출석 보상');

  RETURN jsonb_build_object('success', true, 'reward', 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
