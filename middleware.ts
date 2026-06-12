import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }

  const isApiRoute = pathname.startsWith("/api/")
  const isLoginRoute = pathname === "/login"

  const token = request.cookies.get("session")?.value

  if (isLoginRoute) {
    if (token) {
      const { verifySession } = await import("./lib/auth")
      if (await verifySession(token)) {
        return NextResponse.redirect(new URL("/", request.url))
      }
    }
    return NextResponse.next()
  }

  if (!token) {
    if (isApiRoute) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const { verifySession } = await import("./lib/auth")
  if (!(await verifySession(token))) {
    if (isApiRoute) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    }
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.set("session", "", { maxAge: 0, path: "/" })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
