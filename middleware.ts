/**
 * Middleware - Disabled for public access
 *
 * Re-enable Clerk authentication when needed by uncommenting the code below
 */

// No authentication middleware - all routes are public
export default function middleware() {
  return;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
