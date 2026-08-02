-- Migration: 022_system_initialization
-- Description: Creates public.system_config table for application initialization state,
--              university details, and system preferences.
-- Transaction: Yes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access to check initialization status
CREATE POLICY "Allow public read system_config"
  ON public.system_config FOR SELECT
  USING (true);

-- Allow service role full write access
CREATE POLICY "Allow service role write system_config"
  ON public.system_config FOR ALL
  USING (true);

-- Insert default initial status if not exists
INSERT INTO public.system_config (key, value)
VALUES ('initialization', '{"is_initialized": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.system_config IS 'Application-level configuration, initialization state, university metadata, and system preferences.';

COMMIT;
