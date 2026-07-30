import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = new URL(request.url);

  // Allow public access to landing page and auth pages
  if (pathname === "/" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return;
  }

  // Protect all other routes (dashboard, library, analytics, sessions, etc.)
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
