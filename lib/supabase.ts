import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseUrl = (rawUrl && rawUrl.startsWith("http")) ? rawUrl : "https://dummy.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "dummy";

if (typeof window !== "undefined") {
  (window as any).__supabaseUrl = supabaseUrl;
  (window as any).__rawUrl = rawUrl;
  console.log("[Supabase Config Debug] URL:", supabaseUrl, "Raw URL:", rawUrl);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
