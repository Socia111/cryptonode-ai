-- Complete Supabase Database Rebuild
-- This migration drops everything and rebuilds from scratch

-- Drop all existing policies first
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Drop all existing functions and procedures
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT p.proname, p.oid, n.nspname,
               pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE 'gtrgm_%'
        AND p.proname NOT LIKE 'gin_%'
        AND p.proname NOT LIKE 'similarity%'
        AND p.proname NOT LIKE 'word_similarity%'
        AND p.proname NOT LIKE 'strict_word_similarity%'
        AND p.proname NOT LIKE 'show_%'
        AND p.proname NOT LIKE 'set_limit'
    LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', 
                          func_record.nspname, func_record.proname, func_record.args);
        EXCEPTION WHEN OTHERS THEN
            -- Try dropping as procedure if function drop fails
            EXECUTE format('DROP PROCEDURE IF EXISTS %I.%I(%s) CASCADE', 
                          func_record.nspname, func_record.proname, func_record.args);
        END;
    END LOOP;
END $$;

-- Drop all custom types
DO $$
DECLARE
    type_record RECORD;
BEGIN
    FOR type_record IN 
        SELECT n.nspname, t.typname
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.typtype = 'e'  -- enum types
    LOOP
        EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE', type_record.nspname, type_record.typname);
    END LOOP;
END $$;

-- Drop all existing tables (except system ones)
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', table_record.schemaname, table_record.tablename);
    END LOOP;
END $$;

-- Drop all materialized views
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT schemaname, matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.matviewname);
    END LOOP;
END $$;

-- Drop all sequences
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT schemaname, sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I CASCADE', seq_record.schemaname, seq_record.sequencename);
    END LOOP;
END $$;

-- Now rebuild the core tables needed for the trading application

-- Create user profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create markets table
CREATE TABLE public.markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    exchange TEXT NOT NULL DEFAULT 'bybit',
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create signals table for trading signals
CREATE TABLE public.signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange TEXT NOT NULL DEFAULT 'bybit',
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL DEFAULT '1h',
    direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
    bar_time TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_price NUMERIC,
    price NUMERIC,
    sl NUMERIC,
    tp NUMERIC,
    score NUMERIC,
    filters JSONB DEFAULT '{}',
    indicators JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(exchange, symbol, timeframe, direction, bar_time)
);

-- Create strategy_signals table for higher-level signals
CREATE TABLE public.strategy_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('Buy', 'Sell')),
    timeframe TEXT NOT NULL DEFAULT '15m',
    confidence INTEGER NOT NULL DEFAULT 50,
    tp_price NUMERIC,
    sl_price NUMERIC,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'queued', 'sent', 'filled', 'cancelled')),
    queued_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trades table
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_signal_id UUID REFERENCES public.strategy_signals(id),
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('Buy', 'Sell')),
    qty NUMERIC NOT NULL,
    tp_price NUMERIC,
    sl_price NUMERIC,
    order_link_id TEXT UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trading_accounts table for user API keys
CREATE TABLE public.trading_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    exchange TEXT NOT NULL DEFAULT 'bybit',
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    is_testnet BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exchange)
);

-- Create portfolios table
CREATE TABLE public.portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USDT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create positions table
CREATE TABLE public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('Buy', 'Sell')),
    size NUMERIC NOT NULL,
    entry_price NUMERIC NOT NULL,
    current_price NUMERIC,
    unrealized_pnl NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('Buy', 'Sell')),
    order_type TEXT NOT NULL DEFAULT 'Market',
    qty NUMERIC NOT NULL,
    price NUMERIC,
    status TEXT DEFAULT 'New' CHECK (status IN ('New', 'Filled', 'Cancelled', 'Rejected')),
    order_id TEXT,
    order_link_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exchanges table
CREATE TABLE public.exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    supported_features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default exchanges
INSERT INTO public.exchanges (name, display_name, supported_features) VALUES
('bybit', 'Bybit', '{"spot": true, "futures": true, "testnet": true}'),
('binance', 'Binance', '{"spot": true, "futures": true, "testnet": true}');

-- Insert some default markets
INSERT INTO public.markets (symbol, exchange, base_asset, quote_asset) VALUES
('BTCUSDT', 'bybit', 'BTC', 'USDT'),
('ETHUSDT', 'bybit', 'ETH', 'USDT'),
('SOLUSDT', 'bybit', 'SOL', 'USDT'),
('ADAUSDT', 'bybit', 'ADA', 'USDT'),
('DOTUSDT', 'bybit', 'DOT', 'USDT');

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_markets_updated_at
    BEFORE UPDATE ON public.markets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_signals_updated_at
    BEFORE UPDATE ON public.signals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_strategy_signals_updated_at
    BEFORE UPDATE ON public.strategy_signals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
    BEFORE UPDATE ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trading_accounts_updated_at
    BEFORE UPDATE ON public.trading_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
    BEFORE UPDATE ON public.portfolios
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON public.positions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't block user creation
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create RLS policies for markets (public read)
CREATE POLICY "Anyone can view markets"
    ON public.markets FOR SELECT
    USING (true);

-- Create RLS policies for signals (public read)
CREATE POLICY "Anyone can view signals"
    ON public.signals FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage signals"
    ON public.signals FOR ALL
    USING ((auth.jwt() ->> 'role') = 'service_role')
    WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Create RLS policies for strategy_signals (public read)
CREATE POLICY "Anyone can view strategy signals"
    ON public.strategy_signals FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage strategy signals"
    ON public.strategy_signals FOR ALL
    USING ((auth.jwt() ->> 'role') = 'service_role')
    WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Create RLS policies for trades (user-specific)
CREATE POLICY "Users can view their own trades"
    ON public.trades FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades"
    ON public.trades FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage trades"
    ON public.trades FOR ALL
    USING ((auth.jwt() ->> 'role') = 'service_role')
    WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Create RLS policies for trading_accounts (user-specific)
CREATE POLICY "Users can manage their own trading accounts"
    ON public.trading_accounts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for portfolios (user-specific)
CREATE POLICY "Users can manage their own portfolios"
    ON public.portfolios FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for positions (user-specific)
CREATE POLICY "Users can manage their own positions"
    ON public.positions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for orders (user-specific)
CREATE POLICY "Users can manage their own orders"
    ON public.orders FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for exchanges (public read)
CREATE POLICY "Anyone can view exchanges"
    ON public.exchanges FOR SELECT
    USING (true);

-- Create indexes for better performance
CREATE INDEX idx_signals_symbol_timeframe ON public.signals(symbol, timeframe);
CREATE INDEX idx_signals_created_at ON public.signals(created_at);
CREATE INDEX idx_signals_score ON public.signals(score);
CREATE INDEX idx_strategy_signals_status ON public.strategy_signals(status);
CREATE INDEX idx_strategy_signals_confidence ON public.strategy_signals(confidence);
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX idx_positions_user_id ON public.positions(user_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);