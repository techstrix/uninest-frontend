import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const middleware = auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // If user is authenticated and tries to access /sign-in, redirect to home
  if (session && pathname === "/sign-in") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // If user is NOT authenticated and tries to access protected routes, redirect to sign-in
  if (!session && pathname !== "/sign-in") {
    return NextResponse.redirect(new URL("/sign-in", req.url))
  }

  // Allow access
  return NextResponse.next()
})

export const config = {
  matcher: ["/", "/sign-in", "/((?!api|_next|favicon.ico).*)"],
}

