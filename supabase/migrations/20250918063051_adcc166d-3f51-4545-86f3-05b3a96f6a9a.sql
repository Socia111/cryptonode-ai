-- Create a test user for immediate testing (avoid email verification delays)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test@aitradex1.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Test User"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;

-- Create a simplified test account for immediate API testing
INSERT INTO public.user_trading_accounts (
  user_id,
  exchange,
  account_type,
  api_key_encrypted,
  api_secret_encrypted,
  is_active,
  permissions
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@aitradex1.com' LIMIT 1),
  'bybit',
  'testnet',
  'dkfAH1tEIUQM6YG5Sg', -- demo api key
  '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••',
  true,
  ARRAY['read', 'trade']
) ON CONFLICT DO NOTHING;