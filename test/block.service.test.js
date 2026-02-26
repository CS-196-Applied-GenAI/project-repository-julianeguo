import assert from "node:assert/strict";
import test from "node:test";
import { getBlockedSet } from "../src/services/block.js";

function createBlockQueryMock(blocks = []) {
  return async function queryFn(sql, params = []) {
    if (sql.startsWith("SELECT blocker_id, blocked_id FROM blocks WHERE blocker_id = ? OR blocked_id = ?")) {
      const [viewerId] = params;
      return blocks
        .filter((row) => row.blocker_id === viewerId || row.blocked_id === viewerId)
        .map((row) => ({ blocker_id: row.blocker_id, blocked_id: row.blocked_id }));
    }

    throw new Error(`Unexpected SQL in block service test mock: ${sql}`);
  };
}

test("getBlockedSet includes users blocked by viewer", async () => {
  const queryFn = createBlockQueryMock([
    { blocker_id: 1, blocked_id: 2 },
    { blocker_id: 3, blocked_id: 4 }
  ]);

  const blockedSet = await getBlockedSet(1, { queryFn });
  assert.equal(blockedSet.has(2), true);
  assert.equal(blockedSet.has(3), false);
});

test("getBlockedSet includes users who blocked viewer", async () => {
  const queryFn = createBlockQueryMock([
    { blocker_id: 2, blocked_id: 1 },
    { blocker_id: 3, blocked_id: 4 }
  ]);

  const blockedSet = await getBlockedSet(1, { queryFn });
  assert.equal(blockedSet.has(2), true);
  assert.equal(blockedSet.has(3), false);
});

test("getBlockedSet is mutual for a single block relation", async () => {
  const queryFn = createBlockQueryMock([{ blocker_id: 10, blocked_id: 20 }]);

  const setForTen = await getBlockedSet(10, { queryFn });
  const setForTwenty = await getBlockedSet(20, { queryFn });

  assert.equal(setForTen.has(20), true);
  assert.equal(setForTwenty.has(10), true);
});
