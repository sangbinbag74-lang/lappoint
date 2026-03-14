-- Phase 5: race_results 테이블 (Jolpica API 결과 캐싱) + prediction_type

-- race_results: 경기별 실제 드라이버 순위 저장
CREATE TABLE IF NOT EXISTS public.race_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  position integer NOT NULL,
  driver_code text NOT NULL,       -- "VER", "LEC", "NOR" 등
  driver_name text NOT NULL,       -- "Max Verstappen" 등
  constructor_name text NOT NULL,  -- "Red Bull Racing" 등
  status text NOT NULL DEFAULT 'Finished',
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (race_id, position)
);

ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "race_results public read"
  ON public.race_results FOR SELECT USING (true);

-- predictions에 prediction_type 추가
-- race_winner: 우승 드라이버 예측 (자동 정산 가능)
-- custom:      자유형식 예측 (수동 정산)
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS prediction_type text NOT NULL DEFAULT 'custom'
    CHECK (prediction_type IN ('race_winner', 'custom'));
