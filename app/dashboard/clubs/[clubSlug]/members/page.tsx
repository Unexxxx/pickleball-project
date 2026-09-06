import { MemberTable } from "@/components/clubs/member-table";
export default function MembersPage() {
  return (
    <main className="p-6">
      <h1>Club members</h1>
      <MemberTable members={[]} />
    </main>
  );
}
