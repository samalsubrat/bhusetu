import { NextRequest, NextResponse } from "next/server"
import * as jose from "jose"

// Routes that require authentication
const protectedPaths = ["/dashboard"]

// Routes that should redirect to dashboard when already authenticated
const authPaths = ["/login", "/signup", "/verify"]

async function verifyTokenEdge(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    await jose.jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get("token")?.value

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p))

  const isValid = token ? await verifyTokenEdge(token) : false

  // Protect dashboard
  if (isProtected && !isValid) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isValid) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/verify",
  ],
}