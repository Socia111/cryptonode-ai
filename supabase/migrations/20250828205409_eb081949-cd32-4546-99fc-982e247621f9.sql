-- Create AIRA rankings table
CREATE TABLE public.aira_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rank_position INTEGER NOT NULL,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  bybit_symbol TEXT, -- mapped trading symbol (e.g., SYRAXUSDT)
  score NUMERIC,
  market_cap NUMERIC,
  volume_24h NUMERIC,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aira_rankings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access to AIRA rankings" 
ON public.aira_rankings 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage AIRA rankings" 
ON public.aira_rankings 
FOR ALL 
USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text))
WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));

-- Create index for faster queries
CREATE INDEX idx_aira_rankings_position ON public.aira_rankings(rank_position);
CREATE INDEX idx_aira_rankings_symbol ON public.aira_rankings(token_symbol);
CREATE INDEX idx_aira_rankings_bybit_symbol ON public.aira_rankings(bybit_symbol);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_aira_rankings_updated_at
BEFORE UPDATE ON public.aira_rankings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();