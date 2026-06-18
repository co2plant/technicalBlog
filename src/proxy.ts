import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (shouldHideFromSearch(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  return response;
}

export const config = {
  matcher: ["/interviews/:path*", "/portfolio", "/portfolio/:path*", "/posts/my-portfolio-pdf", "/posts/my-portfolio-pdf/:path*"],
};

function shouldHideFromSearch(pathname: string): boolean {
  return (
    pathname.startsWith("/interviews/") ||
    pathname === "/portfolio" ||
    pathname.startsWith("/portfolio/") ||
    pathname === "/posts/my-portfolio-pdf" ||
    pathname.startsWith("/posts/my-portfolio-pdf/")
  );
}
