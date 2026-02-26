import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createProfileQueryMock({ users = [], follows = [] } = {}) {
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

    if (sql.startsWith("SELECT") && sql.includes("FROM users u")) {
      const [viewerId, userId] = params;
      const user = users.find((row) => row.id === userId);
      if (!user) {
        return [];
      }

      const followerCount = follows.filter((row) => row.following_id === userId).length;
      const followingCount = follows.filter((row) => row.follower_id === userId).length;
      const isFollowing = follows.some(
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

    throw new Error(`Unexpected SQL in users profile test mock: ${sql}`);
  };
}

test("GET /api/users/:id returns 401 when unauthenticated", async () => {
  const app = createApp({
    authQueryFn: createProfileQueryMock(),
    usersQueryFn: createProfileQueryMock(),
    sessionSecret: "test-secret"
  });

  const response = await request(app).get("/api/users/2");
  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Unauthorized");
});

test("GET /api/users/:id returns public profile and counts when authenticated", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const users = [
    { id: 1, username: "viewer_user", password_hash: passwordHash },
    { id: 2, username: "target_user", bio: "about me", profile_picture_url: "/uploads/p2.png" },
    { id: 3, username: "follower_three" }
  ];
  const follows = [
    { follower_id: 1, following_id: 2 },
    { follower_id: 3, following_id: 2 },
    { follower_id: 2, following_id: 1 }
  ];
  const queryFn = createProfileQueryMock({ users, follows });
  const app = createApp({
    authQueryFn: queryFn,
    usersQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    username: "viewer_user",
    password: "StrongPass1!"
  });
  assert.equal(loginResponse.status, 200);

  const response = await agent.get("/api/users/2");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    id: 2,
    username: "target_user",
    bio: "about me",
    profile_picture_url: "/uploads/p2.png",
    follower_count: 2,
    following_count: 1,
    is_following: true
  });
  assert.equal(Object.hasOwn(response.body, "email"), false);
  assert.equal(Object.hasOwn(response.body, "password"), false);
  assert.equal(Object.hasOwn(response.body, "password_hash"), false);
});

test("GET /api/users/:id returns 404 for non-existent user", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const users = [{ id: 1, username: "viewer_user", password_hash: passwordHash }];
  const queryFn = createProfileQueryMock({ users, follows: [] });
  const app = createApp({
    authQueryFn: queryFn,
    usersQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    username: "viewer_user",
    password: "StrongPass1!"
  });
  assert.equal(loginResponse.status, 200);

  const response = await agent.get("/api/users/999");
  assert.equal(response.status, 404);
  assert.equal(response.body.message, "User not found.");
});
