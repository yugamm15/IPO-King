-- ==============================================================================
-- IPO KING - SUPABASE AUTH USERS REFERENCE & PROFILE EXTENSION
-- ==============================================================================
-- In Supabase, user authentication is managed natively in the built-in 'auth.users' table.
-- You do NOT need to manually create a custom password or user table.
--
-- To add users:
-- Go to Supabase Dashboard -> Authentication -> Users -> Click "Add user" ("Create user").
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. (OPTIONAL) PUBLIC PROFILES TABLE
-- If you want to store extra profile metadata synced directly with Supabase Auth:
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT DEFAULT 'IPO KING Administrator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. (OPTIONAL) AUTOMATIC TRIGGER TO SYNC SUPABASE AUTH USERS TO PROFILES
-- When a user is added via Supabase Dashboard (Authentication -> Users),
-- this trigger automatically creates their public profile entry.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'IPO KING Administrator')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. HELPER QUERY: VIEW ALL REGISTERED SUPABASE AUTH USERS
-- Run this in SQL Editor if you want to inspect registered auth users:
-- ------------------------------------------------------------------------------
-- SELECT id, email, created_at, last_sign_in_at, confirmed_at FROM auth.users;
