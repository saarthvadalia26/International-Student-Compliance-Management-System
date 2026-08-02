export default function RootPage() {
  // Edge Middleware handles root route '/' redirection authoritatively as the single source of truth.
  // No page-level redirects exist to prevent duplicate redirects and redirect loops.
  return null;
}
