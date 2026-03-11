import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createByUsernameQueryMock({ users = [], follows = [], blocks = [] } = {}) {
  return async function queryFn(sql, params = []) {
    if (sql.startsWith("SELECT id, username, password_hash FROM users WHERE LOWER(username)")) {
      const [normalizedUsername] = params;
      return users
        .filter((user) => user.username.toLowerCase() === normalizedUsername)
        .map((user) => ({
          id: user.id,
          username: user.username,
          password_hash: user.password_hash
        }));
    }

    if (sql.startsWith("SELECT") && sql.includes("WHERE LOWER(u.username) = ?")) {
      const [viewerId, blockerId, normalizedUsername] = params;
      const user = users.find((row) => row.username.toLowerCase() === normalizedUsername);
      if (!user) {
        return [];
      }

      const followerCount = follows.filter((row) => row.following_id === user.id).length;
      const followingCount = follows.filter((row) => row.follower_id === user.id).length;
      const isFollowing = follows.some(
        (row) => row.follower_id === viewerId && row.following_id === user.id
      );
      const isBlocked = blocks.some(
        (row) => row.blocker_id === blockerId && row.blocked_id === user.id
      );

      return [
        {
          id: user.id,
          username: user.username,
          bio: user.bio ?? null,
          profile_picture_url: user.profile_picture_url ?? null,
          follower_count: followerCount,
          following_count: followingCount,
          is_following: isFollowing ? 1 : 0,
          is_blocked: isBlocked ? 1 : 0
        }
      ];
    }

    throw new Error(`Unexpected SQL in users by-username test mock: ${sql}`);
  };
}

async function loginAs(agent, username, password) {
  const response = await agent.post("/api/auth/login").send({ username, password });
  assert.equal(response.status, 200);
}

test("GET /api/users/by-username/:username returns profile with follow and block state", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const queryFn = createByUsernameQueryMock({
    users: [
      { id: 1, username: "viewer_user", password_hash: passwordHash },
      { id: 2, username: "target_user", bio: "about target", profile_picture_url: "/uploads/p2.png" }
    ],
    follows: [{ follower_id: 1, following_id: 2 }],
    blocks: [{ blocker_id: 1, blocked_id: 2 }]
  });
  const app = createApp({
    authQueryFn: queryFn,
    usersQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");

  const response = await agent.get("/api/users/by-username/target_user");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    id: 2,
    username: "target_user",
    bio: "about target",
    profile_picture_url: "/uploads/p2.png",
    follower_count: 1,
    following_count: 0,
    is_following: true,
    is_blocked: true
  });
});

test("GET /api/users/by-username/:username requires authentication", async () => {
  const app = createApp({
    authQueryFn: createByUsernameQueryMock(),
    usersQueryFn: createByUsernameQueryMock(),
    sessionSecret: "test-secret"
  });

  const response = await request(app).get("/api/users/by-username/anyone");
  assert.equal(response.status, 401);
});

test("GET /api/users/by-username/:username returns 404 when missing", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const queryFn = createByUsernameQueryMock({
    users: [{ id: 1, username: "viewer_user", password_hash: passwordHash }]
  });
  const app = createApp({
    authQueryFn: queryFn,
    usersQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");

  const response = await agent.get("/api/users/by-username/missing_user");
  assert.equal(response.status, 404);
  assert.equal(response.body.message, "User not found.");
});
