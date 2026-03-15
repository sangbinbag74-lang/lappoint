-- 댓글 작성 정지 기능 — users 테이블에 정지 관련 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS comment_suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS comment_suspend_reason text;
