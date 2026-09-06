type Member = {
  id: string;
  role: string;
  status: string;
  players?: { display_name: string } | null;
};
export function MemberTable({ members }: { members: Member[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Player</th>
          <th>Role</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.id}>
            <td>{m.players?.display_name ?? "Player"}</td>
            <td>{m.role}</td>
            <td>{m.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
