import { redirect } from "next/navigation";

export default function RootPage() {
  // Edge Middleware handles root route '/' redirection authoritatively based on DB setup status.
  // Fallback to /login if middleware is bypassed.
  redirect("/login");
}
