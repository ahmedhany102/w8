import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/products') || 
                          req.nextUrl.pathname.startsWith('/cart')
  const isLoginPage = req.nextUrl.pathname === '/login'
  
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }
  
  if (session && isLoginPage) {
    const redirectUrl = new URL('/', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/products/:path*', '/cart/:path*', '/login']
}
