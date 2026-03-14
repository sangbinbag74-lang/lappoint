-- prediction_type 기반으로 session_type 수정 (기존 예측 항목 대상)
UPDATE public.predictions
SET session_type = 'qualifying'
WHERE prediction_type IN ('pole_position', 'qualifying_duel')
  AND session_type = 'race';
