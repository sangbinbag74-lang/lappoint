-- Phase 5: races 테이블에 round 컬럼 추가 (Jolpica F1 API 연동용)
ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS round integer;
