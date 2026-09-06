import type { ReactNode } from "react";
import { ClubSidebar } from "@/components/layout/club-sidebar";
export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  return (
    <div className="club-layout">
      <ClubSidebar clubSlug={clubSlug} />
      <div className="club-content">{children}</div>
    </div>
  );
}
