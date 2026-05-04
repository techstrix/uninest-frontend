import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = ["/sign-in"]

export const middleware = auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }

  if (session && pathname === "/sign-in") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if (!session && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/sign-in", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next|favicon.ico).*)"],
}
