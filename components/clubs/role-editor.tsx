export function RoleEditor() {
  return (
    <form>
      <label>
        Role
        <select name="role">
          <option value="member">Member</option>
          <option value="staff">Staff</option>
          <option value="organizer">Organizer</option>
          <option value="score_official">Score official</option>
          <option value="owner">Owner</option>
        </select>
      </label>
      <label>
        Reason
        <input name="reason" required />
      </label>
      <button>Update role</button>
    </form>
  );
}
