import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";
import { getBlockedSet } from "../src/services/block.js";

function createBlockRoutesQueryMock({ users = [], follows = [], blocks = [] } = {}) {
  const state = {
    users: structuredClone(users),
    follows: structuredClone(follows),
    blocks: structuredClone(blocks)
  };

  async function queryFn(sql, params = []) {
    if (sql.startsWith("SELECT id, username, password_hash FROM users WHERE LOWER(username)")) {
      const [normalizedUsername] = params;
      return state.users
        .filter((user) => user.username.toLowerCase() === normalizedUsername)
        .map((user) => ({
          id: user.id,
          username: user.username,
          password_hash: user.password_hash
        }));
    }

    if (sql.startsWith("SELECT id FROM users WHERE id = ?")) {
      const [userId] = params;
      return state.users.filter((user) => user.id === userId).map((user) => ({ id: user.id }));
    }

    if (sql.startsWith("INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)")) {
      const [blockerId, blockedId] = params;
      const exists = state.blocks.some(
        (row) => row.blocker_id === blockerId && row.blocked_id === blockedId
      );
      if (!exists) {
        state.blocks.push({ blocker_id: blockerId, blocked_id: blockedId });
      }
      return { affectedRows: exists ? 0 : 1 };
    }

    if (sql.startsWith("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?")) {
      const [blockerId, blockedId] = params;
      const before = state.blocks.length;
      state.blocks = state.blocks.filter(
        (row) => !(row.blocker_id === blockerId && row.blocked_id === blockedId)
      );
      return { affectedRows: before - state.blocks.length };
    }

    if (sql.startsWith("DELETE FROM follows WHERE follower_id = ? AND following_id = ?")) {
      const [followerId, followingId] = params;
      const before = state.follows.length;
      state.follows = state.follows.filter(
        (row) => !(row.follower_id === followerId && row.following_id === followingId)
      );
      return { affectedRows: before - state.follows.length };
    }

    if (sql.startsWith("SELECT blocker_id, blocked_id FROM blocks WHERE blocker_id = ? OR blocked_id = ?")) {
      const [viewerId] = params;
      return state.blocks
        .filter((row) => row.blocker_id === viewerId || row.blocked_id === viewerId)
        .map((row) => ({ blocker_id: row.blocker_id, blocked_id: row.blocked_id }));
    }

    throw new Error(`Unexpected SQL in users block test mock: ${sql}`);
  }

  return { queryFn, state };
}

async function loginAs(agent, username, password) {
  const response = await agent.post("/api/auth/login").send({ username, password });
  assert.equal(response.status, 200);
}

test("POST /api/users/:id/block creates block and removes follow in both directions", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createBlockRoutesQueryMock({
    users: [
      { id: 1, username: "viewer_user", password_hash: passwordHash },
      { id: 2, username: "target_user" }
    ],
    follows: [
      { follower_id: 1, following_id: 2 },
      { follower_id: 2, following_id: 1 }
    ],
    blocks: []
  });
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");

  const response = await agent.post("/api/users/2/block");
  assert.equal(response.status, 204);
  assert.equal(state.blocks.length, 1);
  assert.equal(state.follows.length, 0);

  const viewerBlockedSet = await getBlockedSet(1, { queryFn });
  const targetBlockedSet = await getBlockedSet(2, { queryFn });
  assert.equal(viewerBlockedSet.has(2), true);
  assert.equal(targetBlockedSet.has(1), true);
});

test("DELETE /api/users/:id/block removes block only (no auto-refollow)", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createBlockRoutesQueryMock({
    users: [
      { id: 1, username: "viewer_user", password_hash: passwordHash },
      { id: 2, username: "target_user" },
      { id: 3, username: "other_user" }
    ],
    follows: [{ follower_id: 1, following_id: 3 }],
    blocks: [{ blocker_id: 1, blocked_id: 2 }]
  });
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");

  const response = await agent.delete("/api/users/2/block");
  assert.equal(response.status, 204);
  assert.equal(state.blocks.length, 0);
  assert.deepEqual(state.follows, [{ follower_id: 1, following_id: 3 }]);

  const viewerBlockedSet = await getBlockedSet(1, { queryFn });
  assert.equal(viewerBlockedSet.has(2), false);
});

test("block self returns 400", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createBlockRoutesQueryMock({
    users: [{ id: 1, username: "viewer_user", password_hash: passwordHash }],
    blocks: []
  });
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");
  const response = await agent.post("/api/users/1/block");
  assert.equal(response.status, 400);
});

test("delete block with invalid user id returns 404", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createBlockRoutesQueryMock({
    users: [{ id: 1, username: "viewer_user", password_hash: passwordHash }],
    blocks: []
  });
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");
  const response = await agent.delete("/api/users/not-a-number/block");
  assert.equal(response.status, 404);
});
