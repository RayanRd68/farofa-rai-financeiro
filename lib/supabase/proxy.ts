import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import type { Database } from "@/lib/types"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config"

const PUBLIC_PREFIXES = ["/login", "/auth", "/api", "/_next", "/favicon.ico"]

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}

/** Refresh do token + checagem otimista de sessão (só cookie). RLS é a real. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const authed = Boolean(data?.claims?.sub)
  const { pathname } = request.nextUrl

  if (!authed && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (authed && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}
