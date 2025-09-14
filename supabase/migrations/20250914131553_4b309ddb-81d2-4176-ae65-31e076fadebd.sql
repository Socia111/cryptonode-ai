-- Drop recently added custom functions (keeping core system functions)

-- Drop memory and emotion analysis functions
DROP FUNCTION IF EXISTS public.add_memory_fragment(uuid, text, jsonb, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_memory_fragment(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.analyze_conversation_emotion(text) CASCADE;

-- Drop avatar and health calculation functions  
DROP FUNCTION IF EXISTS public.calculate_aura_resonance(jsonb, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_comprehensive_health_score(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_encounter_xp(numeric, numeric, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_health_score(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_user_tier(integer) CASCADE;

-- Drop recent security and rate limiting functions
DROP FUNCTION IF EXISTS public.check_rate_limit(uuid, text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.check_rate_limit_secure(uuid, text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.comprehensive_security_audit() CASCADE;
DROP FUNCTION IF EXISTS public.enhanced_security_monitoring() CASCADE;

-- Drop team and credit functions
DROP FUNCTION IF EXISTS public.consume_credits(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.create_default_goals(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_team_credits() CASCADE;

-- Drop notification and social functions
DROP FUNCTION IF EXISTS public.generate_daily_inspiration(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.generate_personalized_achievement(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_achievement_progress(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_daily_challenges(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_nearby_users(numeric, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.get_personal_leaderboard(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_recommended_activities(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_avatar_with_traits(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_stats_summary(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_traits_cached(uuid) CASCADE;

-- Drop refresh and maintenance functions
DROP FUNCTION IF EXISTS public.refresh_materialized_views() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_trait_cache(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_security_monitoring() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_security_posture_safe() CASCADE;

-- Drop validation functions
DROP FUNCTION IF EXISTS public.validate_user_input(text, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.validate_user_input_enhanced(text, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.validate_user_input_comprehensive(text, text, integer, text[]) CASCADE;

-- Drop batch logging functions
DROP FUNCTION IF EXISTS public.log_security_event_batch(jsonb[]) CASCADE;
DROP FUNCTION IF EXISTS public.log_security_policy_hardening() CASCADE;
DROP FUNCTION IF EXISTS public.log_critical_security_fix() CASCADE;

-- Drop achievement and progress functions
DROP FUNCTION IF EXISTS public.progress_achievement(uuid, uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.reward_achievement(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.sync_health_data(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_streak(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_health_score(uuid, numeric) CASCADE;

-- Drop trading automation functions
DROP FUNCTION IF EXISTS public.start_automated_trading_session() CASCADE;
DROP FUNCTION IF EXISTS public.generate_live_signals() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_signal_automation() CASCADE;

-- Clean up any orphaned functions that may have been created recently
-- (This query will show any remaining custom functions that might need manual review)
-- SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
-- WHERE n.nspname = 'public' AND p.proowner = (SELECT oid FROM pg_roles WHERE rolname = 'postgres');