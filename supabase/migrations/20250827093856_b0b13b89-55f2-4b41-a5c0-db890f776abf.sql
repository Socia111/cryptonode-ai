-- Create quantum_analysis table for storing quantum analysis results
CREATE TABLE public.quantum_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  quantum_confidence NUMERIC NOT NULL DEFAULT 0,
  quantum_probability NUMERIC NOT NULL DEFAULT 0,
  price_target NUMERIC,
  risk_assessment TEXT,
  analysis_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quantum_analysis ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (since this is market data)
CREATE POLICY "Anyone can view quantum analysis" 
ON public.quantum_analysis 
FOR SELECT 
USING (true);

-- Create policy for service role to insert/update
CREATE POLICY "Service role can manage quantum analysis" 
ON public.quantum_analysis 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create index for performance
CREATE INDEX idx_quantum_analysis_symbol ON public.quantum_analysis(symbol);
CREATE INDEX idx_quantum_analysis_confidence ON public.quantum_analysis(quantum_confidence DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_quantum_analysis_updated_at
BEFORE UPDATE ON public.quantum_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();