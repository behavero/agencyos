import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your app very slow!

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  if (
    !user &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login/register
  if (
    user &&
    (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public assets)
     * - privacy (public legal page)
     * - terms (public legal page)
     * - data-deletion (public legal page)
     * - u/ (public bio pages)
     * - s/ (smart redirects)
     * - api/auth (auth routes)
     * - api/webhooks (webhook endpoints - have their own signature verification)
     * - api/cron (cron job endpoints - have CRON_SECRET verification)
     * - api/bio/track (public tracking endpoint)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|privacy|terms|data-deletion|u/|s/|api/auth|api/webhooks|api/cron|api/bio/track).*)',
  ],
}
