-- Phase 18: 배팅 금지 및 수동 마감 기능
ALTER TABLE races ADD COLUMN IF NOT EXISTS betting_locked boolean DEFAULT false;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS manually_locked boolean DEFAULT false;
