-- Phase 8: race session dates + prediction session_type

-- 1) races 테이블에 세션별 시작 시간 추가
ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS qualifying_date timestamptz,
  ADD COLUMN IF NOT EXISTS sprint_date timestamptz,
  ADD COLUMN IF NOT EXISTS sprint_qualifying_date timestamptz;

-- 2) predictions 테이블에 세션 타입 추가 (배팅 마감 기준)
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'race';

ALTER TABLE public.predictions
  DROP CONSTRAINT IF EXISTS predictions_session_type_check;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_session_type_check
  CHECK (session_type IN ('race', 'qualifying', 'sprint', 'sprint_qualifying'));
