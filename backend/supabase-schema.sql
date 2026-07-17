-- Run this in Supabase SQL Editor to create tables

CREATE TABLE IF NOT EXISTS analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Analysis',
  created_at TIMESTAMPTZ DEFAULT now(),
  summary JSONB NOT NULL,
  shipments JSONB NOT NULL,
  insights JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  confidence JSONB NOT NULL DEFAULT '{"score":"medium","percentage":50,"reasons":[]}'
);

CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at DESC);
