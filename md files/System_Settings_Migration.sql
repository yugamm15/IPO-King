-- ==============================================================================
-- IPO KING - SYSTEM SETTINGS & FINANCIAL DEFAULTS TABLE
-- ==============================================================================
-- Execute this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- This table stores global initial defaults for Profit Sharing %, TDS Deduction %, Bid Amounts, etc.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE SYSTEM SETTINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    default_customer_profit_pct NUMERIC(5, 2) NOT NULL DEFAULT 40.00,
    default_company_profit_pct NUMERIC(5, 2) NOT NULL DEFAULT 60.00,
    default_tds_pct NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    enable_tds_deduction BOOLEAN NOT NULL DEFAULT true,
    default_retail_bid_amount NUMERIC(12, 2) NOT NULL DEFAULT 15000.00,
    default_exit_mode TEXT NOT NULL DEFAULT 'MARKET',
    default_category TEXT NOT NULL DEFAULT 'RETAIL',
    company_name TEXT DEFAULT 'IPO KING Enterprise',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public / anon read access for calculation initialization
DROP POLICY IF EXISTS "Allow public read access to system_settings" ON public.system_settings;
CREATE POLICY "Allow public read access to system_settings"
ON public.system_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow authenticated / service role full modification access
DROP POLICY IF EXISTS "Allow authenticated full access to system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated full access to system_settings"
ON public.system_settings
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. INSERT DEFAULT INITIAL CONFIGURATION ROW
-- ------------------------------------------------------------------------------
INSERT INTO public.system_settings (
    id,
    default_customer_profit_pct,
    default_company_profit_pct,
    default_tds_pct,
    enable_tds_deduction,
    default_retail_bid_amount,
    default_exit_mode,
    default_category,
    company_name
)
VALUES (
    1,
    40.00,
    60.00,
    10.00,
    true,
    15000.00,
    'MARKET',
    'RETAIL',
    'IPO KING Enterprise'
)
ON CONFLICT (id) DO UPDATE SET
    default_customer_profit_pct = EXCLUDED.default_customer_profit_pct,
    default_company_profit_pct = EXCLUDED.default_company_profit_pct,
    default_tds_pct = EXCLUDED.default_tds_pct,
    enable_tds_deduction = EXCLUDED.enable_tds_deduction,
    default_retail_bid_amount = EXCLUDED.default_retail_bid_amount,
    updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 4. VERIFICATION QUERY
-- SELECT * FROM public.system_settings WHERE id = 1;
-- ------------------------------------------------------------------------------
