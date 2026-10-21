import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getClubHome } from "@/lib/queries/club-home";

// Club tools (event workspace, new event, reports). The header is the only
// main navigation; this just links back to the club home.
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const club = await getClubHome(clubSlug);
  return (
    <div className="club-tools">
      {club ? (
        <Link className="club-backlink" href={`/clubs/${club.slug}`}>
          <ArrowLeft aria-hidden="true" size={16} /> {club.name}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
