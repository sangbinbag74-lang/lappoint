-- Phase 7: qualifying_results 테이블, is_fastest_lap, prediction_type 확장

-- 1) race_results에 is_fastest_lap 컬럼 추가
ALTER TABLE public.race_results
  ADD COLUMN IF NOT EXISTS is_fastest_lap boolean NOT NULL DEFAULT false;

-- 2) qualifying_results 테이블 신규 생성
CREATE TABLE IF NOT EXISTS public.qualifying_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  position integer NOT NULL,
  driver_code text NOT NULL,
  driver_name text NOT NULL,
  constructor_name text NOT NULL,
  q1_time text,
  q2_time text,
  q3_time text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (race_id, position)
);

ALTER TABLE public.qualifying_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qualifying_results public read"
  ON public.qualifying_results FOR SELECT USING (true);

-- 3) prediction_type CHECK 확장 (기존 2개 → 8개)
ALTER TABLE public.predictions
  DROP CONSTRAINT IF EXISTS predictions_prediction_type_check;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_prediction_type_check
  CHECK (prediction_type IN (
    'race_winner',
    'race_constructor',
    'fastest_lap',
    'pole_position',
    'podium_yn',
    'finisher_count',
    'qualifying_duel',
    'custom'
  ));
