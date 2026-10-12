import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Every page requires a session except the sign-in page; API routes and assets are excluded below.
// With lazy Auth.js config, `auth(callback)` resolves asynchronously to the wrapped handler,
// so it's awaited inside a plain `proxy` function (which is what Next.js checks for).
const withAuth = auth((request) => {
  if (!request.auth && request.nextUrl.pathname !== "/signin") {
    const url = new URL("/signin", request.nextUrl);
    url.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
});

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Auth.js types the wrapper's second argument as a route-handler context; in a proxy it's the fetch event.
  return (await withAuth)(request, event as never);
}

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico).*)"],
};
