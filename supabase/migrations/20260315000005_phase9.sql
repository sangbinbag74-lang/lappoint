-- Phase 9: avatar_url, bet_comments, sort_order

-- 1) users에 avatar_url 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2) bet_comments 테이블 신규
CREATE TABLE IF NOT EXISTS public.bet_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  bet_id uuid NOT NULL REFERENCES public.bets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bet_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read comments"
  ON public.bet_comments FOR SELECT USING (true);
CREATE POLICY "user can insert own comment"
  ON public.bet_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3) predictions에 sort_order 추가 (세션 내 항목 순서 제어)
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 99;
