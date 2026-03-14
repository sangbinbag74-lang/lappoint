-- Phase 14: comment enhancements (likes, edit/delete, 1-per-bet)

-- 1. Add updated_at to bet_comments
ALTER TABLE public.bet_comments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Enforce 1 comment per bet (UNIQUE on bet_id)
-- First deduplicate: keep the latest comment per bet_id
DELETE FROM public.bet_comments
WHERE id NOT IN (
  SELECT DISTINCT ON (bet_id) id
  FROM public.bet_comments
  ORDER BY bet_id, created_at DESC
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bet_comments_bet_id_unique'
      AND conrelid = 'public.bet_comments'::regclass
  ) THEN
    ALTER TABLE public.bet_comments ADD CONSTRAINT bet_comments_bet_id_unique UNIQUE (bet_id);
  END IF;
END $$;

-- 3. UPDATE / DELETE RLS for own comments
DROP POLICY IF EXISTS "user can update own comment" ON public.bet_comments;
CREATE POLICY "user can update own comment" ON public.bet_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user can delete own comment" ON public.bet_comments;
CREATE POLICY "user can delete own comment" ON public.bet_comments
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Comment likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  uuid        NOT NULL REFERENCES public.bet_comments(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.users(id)        ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can read comment likes" ON public.comment_likes;
CREATE POLICY "anyone can read comment likes" ON public.comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user can like comments" ON public.comment_likes;
CREATE POLICY "user can like comments" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user can unlike comments" ON public.comment_likes;
CREATE POLICY "user can unlike comments" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);
