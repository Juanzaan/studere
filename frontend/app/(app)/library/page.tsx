import { LibraryPage } from "@/components/library-page";

export default function Page({ searchParams }: { searchParams?: { q?: string } }) {
  return <LibraryPage initialQuery={searchParams?.q || ""} />;
}
