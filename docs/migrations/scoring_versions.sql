-- Migration: Create scoring_versions table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS scoring_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scoring_versions_active
  ON scoring_versions (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_scoring_versions_created
  ON scoring_versions (created_at DESC);
