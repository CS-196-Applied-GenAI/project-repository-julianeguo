import { query as dbQuery } from "../db.js";

export async function getBlockedSet(viewerId, { queryFn = dbQuery } = {}) {
  const rows = await queryFn(
    "SELECT blocker_id, blocked_id FROM blocks WHERE blocker_id = ? OR blocked_id = ?",
    [viewerId, viewerId]
  );

  const blockedSet = new Set();
  for (const row of rows) {
    if (row.blocker_id === viewerId) {
      blockedSet.add(row.blocked_id);
    } else if (row.blocked_id === viewerId) {
      blockedSet.add(row.blocker_id);
    }
  }

  return blockedSet;
}
