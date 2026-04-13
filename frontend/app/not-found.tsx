"use client";

import dynamic from "next/dynamic";

const NotFoundScene = dynamic(
  () => import("@/components/not-found-scene").then(mod => ({ default: mod.NotFoundScene })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-white text-6xl font-bold animate-pulse">404</div>
      </div>
    ),
  }
);

export default function NotFound() {
  return <NotFoundScene />;
}
