import { createBrowserClient } from "@supabase/ssr";

export const createClient = (accessToken?: string) => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    return createBrowserClient(SUPABASE_URL, accessToken || SUPABASE_ANON_KEY);
}