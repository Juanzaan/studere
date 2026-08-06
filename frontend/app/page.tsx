import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// The home route is handled entirely by middleware: anonymous visitors are
// served the standalone landing (public/landing-prototype.html) via a rewrite,
// and signed-in users are redirected to /dashboard. This page only runs as a
// fallback if the middleware bypasses "/".
export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  redirect("/landing-prototype.html");
}
