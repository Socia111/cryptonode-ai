-- Drop recently added custom functions (avoiding procedures and system functions)

-- Drop memory and analysis functions if they exist
DROP FUNCTION IF EXISTS public.analyze_conversation_emotion(text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_aura_resonance(jsonb, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_encounter_xp(numeric, numeric, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_user_tier(integer) CASCADE;

-- Drop security audit functions  
DROP FUNCTION IF EXISTS public.comprehensive_security_audit() CASCADE;
DROP FUNCTION IF EXISTS public.enhanced_security_monitoring() CASCADE;

-- Drop team credit functions
DROP FUNCTION IF EXISTS public.consume_credits(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.create_default_goals(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_team_credits() CASCADE;

-- Drop user interface functions
DROP FUNCTION IF EXISTS public.get_nearby_users(numeric, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_traits_cached(uuid) CASCADE;

-- Drop validation functions with specific signatures
DROP FUNCTION IF EXISTS public.validate_user_input(text, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.validate_user_input_enhanced(text, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.validate_user_input_comprehensive(text, text, integer, text[]) CASCADE;

-- Drop batch logging
DROP FUNCTION IF EXISTS public.log_security_event_batch(jsonb[]) CASCADE;

-- Drop trading automation
DROP FUNCTION IF EXISTS public.start_automated_trading_session() CASCADE;
DROP FUNCTION IF EXISTS public.generate_live_signals() CASCADE;

-- Drop cache refresh function
DROP FUNCTION IF EXISTS public.refresh_trait_cache(uuid) CASCADE;

-- Drop materialized view refresh (this is a regular function)
DROP FUNCTION IF EXISTS public.refresh_materialized_views() CASCADE;