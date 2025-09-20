-- Update whitelist settings to enable comprehensive trading with all symbols
UPDATE public.whitelist_settings 
SET 
  whitelist_enabled = true,
  max_symbols = 1000,
  auto_update = true,
  last_updated = now(),
  updated_at = now()
WHERE id = (
  SELECT id FROM public.whitelist_settings 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- If no whitelist settings exist, create default comprehensive settings
INSERT INTO public.whitelist_settings (
  whitelist_enabled,
  whitelist_pairs,
  max_symbols,
  auto_update,
  created_at,
  updated_at,
  last_updated
)
SELECT 
  true,
  ARRAY[]::text[], -- Will be populated by fetch-all-symbols function
  1000,
  true,
  now(),
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.whitelist_settings);

-- Update app settings to indicate comprehensive mode
INSERT INTO public.app_settings (key, value, description, updated_at)
VALUES (
  'comprehensive_trading_mode',
  '{"enabled": true, "enabled_at": "' || now() || '", "mode": "all_symbols"}',
  'Comprehensive trading mode across all available symbols',
  now()
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = '{"enabled": true, "enabled_at": "' || now() || '", "mode": "all_symbols"}',
  updated_at = now();