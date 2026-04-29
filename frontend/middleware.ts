import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * middleware.ts — Supabase Auth Session Handler
 *
 * WAJIB ADA untuk @supabase/ssr bekerja dengan benar di Next.js App Router.
 * Tanpa file ini, Supabase OAuth callback (token di URL hash) tidak akan pernah
 * diproses dan disimpan ke cookie → semua request API akan selalu 401.
 *
 * Fungsi utama:
 * 1. Membaca session dari cookie pada setiap request
 * 2. Menyegarkan (refresh) token jika sudah expired
 * 3. Meneruskan request dengan cookie yang sudah di-update
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session agar token tidak expired — JANGAN hapus baris ini
  // Ini juga yang menangkap OAuth callback dari Google
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Tidak perlu redirect — biarkan semua route bisa diakses
  // Auth guard dilakukan di component level masing-masing

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match semua request path KECUALI:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - file dengan ekstensi (png, jpg, dll)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
