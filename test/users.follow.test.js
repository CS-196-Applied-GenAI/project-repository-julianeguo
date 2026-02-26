import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createFollowQueryMock({ users = [], follows = [] } = {}) {
  const state = {
    users: structuredClone(users),
    follows: structuredClone(follows)
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

    if (sql.startsWith("INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)")) {
      const [followerId, followingId] = params;
      const exists = state.follows.some(
        (row) => row.follower_id === followerId && row.following_id === followingId
      );
      if (!exists) {
        state.follows.push({ follower_id: followerId, following_id: followingId });
      }
      return { affectedRows: exists ? 0 : 1 };
    }

    if (sql.startsWith("DELETE FROM follows WHERE follower_id = ? AND following_id = ?")) {
      const [followerId, followingId] = params;
      const before = state.follows.length;
      state.follows = state.follows.filter(
        (row) => !(row.follower_id === followerId && row.following_id === followingId)
      );
      return { affectedRows: before - state.follows.length };
    }

    if (sql.startsWith("SELECT") && sql.includes("FROM users u")) {
      const [viewerId, userId] = params;
      const user = state.users.find((row) => row.id === userId);
      if (!user) {
        return [];
      }

      const followerCount = state.follows.filter((row) => row.following_id === userId).length;
      const followingCount = state.follows.filter((row) => row.follower_id === userId).length;
      const isFollowing = state.follows.some(
        (row) => row.follower_id === viewerId && row.following_id === userId
      );
      return [
        {
          id: user.id,
          username: user.username,
          bio: user.bio ?? null,
          profile_picture_url: user.profile_picture_url ?? null,
          follower_count: followerCount,
          following_count: followingCount,
          is_following: isFollowing ? 1 : 0
        }
      ];
    }

    throw new Error(`Unexpected SQL in users follow test mock: ${sql}`);
  }

  return { queryFn, state };
}

async function loginAs(agent, username, password) {
  const response = await agent.post("/api/auth/login").send({ username, password });
  assert.equal(response.status, 200);
}

test("follow then profile shows is_following true and updated counts", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createFollowQueryMock({
    users: [
      { id: 1, username: "viewer_user", password_hash: passwordHash },
      { id: 2, username: "target_user", bio: "target bio" }
    ],
    follows: []
  });
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");

  const followResponse = await agent.post("/api/users/2/follow");
  assert.equal(followResponse.status, 204);

  const profileResponse = await agent.get("/api/users/2");
  assert.equal(profileResponse.status, 200);
  assert.equal(profileResponse.body.is_following, true);
  assert.equal(profileResponse.body.follower_count, 1);
  assert.equal(profileResponse.body.following_count, 0);
});

test("unfollow then profile shows is_following false", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createFollowQueryMock({
    users: [
      { id: 1, username: "viewer_user", password_hash: passwordHash },
      { id: 2, username: "target_user", bio: "target bio" }
    ],
    follows: [{ follower_id: 1, following_id: 2 }]
  });
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");

  const unfollowResponse = await agent.delete("/api/users/2/follow");
  assert.equal(unfollowResponse.status, 204);

  const profileResponse = await agent.get("/api/users/2");
  assert.equal(profileResponse.status, 200);
  assert.equal(profileResponse.body.is_following, false);
  assert.equal(profileResponse.body.follower_count, 0);
});

test("follow self returns 400", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createFollowQueryMock({
    users: [{ id: 1, username: "viewer_user", password_hash: passwordHash }],
    follows: []
  });
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");

  const response = await agent.post("/api/users/1/follow");
  assert.equal(response.status, 400);
});

test("follow non-existent user returns 404", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createFollowQueryMock({
    users: [{ id: 1, username: "viewer_user", password_hash: passwordHash }],
    follows: []
  });
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");
  const response = await agent.post("/api/users/999/follow");
  assert.equal(response.status, 404);
});

test("delete follow with invalid user id returns 404", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createFollowQueryMock({
    users: [{ id: 1, username: "viewer_user", password_hash: passwordHash }],
    follows: []
  });
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");
  const response = await agent.delete("/api/users/not-a-number/follow");
  assert.equal(response.status, 404);
});
