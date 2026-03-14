-- races.name에 UNIQUE 제약 추가 (syncF1Calendar upsert onConflict 용)
ALTER TABLE public.races
  ADD CONSTRAINT races_name_unique UNIQUE (name);
