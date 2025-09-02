-- Create spynx_scores table for crypto scoring data
CREATE TABLE IF NOT EXISTS public.spynx_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  score NUMERIC NOT NULL DEFAULT 0,
  market_cap NUMERIC,
  volume_24h NUMERIC,
  price_change_24h NUMERIC,
  liquidity NUMERIC,
  holder_count INTEGER,
  whale_activity NUMERIC,
  sentiment NUMERIC,
  roi_forecast NUMERIC,
  price NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on spynx_scores table
ALTER TABLE public.spynx_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for spynx_scores (public read access)
CREATE POLICY "Anyone can view spynx scores" 
ON public.spynx_scores 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage spynx scores" 
ON public.spynx_scores 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_spynx_scores_score ON public.spynx_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_spynx_scores_token_symbol ON public.spynx_scores(token_symbol);

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_spynx_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spynx_scores_updated_at
  BEFORE UPDATE ON public.spynx_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_spynx_scores_updated_at();