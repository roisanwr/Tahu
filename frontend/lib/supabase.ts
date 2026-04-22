/**
 * lib/supabase.ts — Supabase Client Configuration
 *
 * Menggunakan @supabase/ssr untuk kompatibilitas penuh dengan
 * Next.js 14 App Router (Server Components + Client Components).
 *
 * Usage:
 *   // Client Component
 *   import { createBrowserClient } from "@/lib/supabase"
 *   const supabase = createBrowserClient()
 *
 *   // Server Component / Route Handler
 *   import { createServerClient } from "@/lib/supabase"
 *   const supabase = await createServerClient()
 */
import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

/**
 * Browser client — gunakan di Client Components ('use client').
 * Menggunakan cookie-based auth secara otomatis via @supabase/ssr.
 */
export function createBrowserClient() {
  return _createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * URL base backend FastAPI.
 * Digunakan untuk fetch ke endpoint /v1/...
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";
