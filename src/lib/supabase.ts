import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Client Supabase, ou null si les clés ne sont pas configurées (l'app passe alors en « mode local »). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
export const hasBackend = !!supabase;
