import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createAuthQueryMock(users = []) {
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

    if (sql.startsWith("SELECT id, username, email, bio, profile_picture_url FROM users WHERE id")) {
      const [id] = params;
      return users
        .filter((user) => user.id === id)
        .map((user) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          bio: user.bio ?? null,
          profile_picture_url: user.profile_picture_url ?? null
        }));
    }

    throw new Error(`Unexpected SQL in auth session test mock: ${sql}`);
  };
}

test("GET /api/auth/me without session returns 401", async () => {
  const app = createApp({ authQueryFn: createAuthQueryMock([]), sessionSecret: "test-secret" });

  const response = await request(app).get("/api/auth/me");

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Unauthorized");
});

test("after login, GET /api/auth/me returns current user", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const app = createApp({
    authQueryFn: createAuthQueryMock([
      {
        id: 11,
        username: "valid_user",
        email: "valid@example.com",
        password_hash: passwordHash,
        bio: "hello",
        profile_picture_url: null
      }
    ]),
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    username: "valid_user",
    password: "StrongPass1!"
  });
  assert.equal(loginResponse.status, 200);

  const meResponse = await agent.get("/api/auth/me");
  assert.equal(meResponse.status, 200);
  assert.deepEqual(meResponse.body, {
    id: 11,
    username: "valid_user",
    email: "valid@example.com",
    bio: "hello",
    profile_picture_url: null
  });
  assert.equal(Object.hasOwn(meResponse.body, "password"), false);
  assert.equal(Object.hasOwn(meResponse.body, "password_hash"), false);
});

test("after logout, GET /api/auth/me returns 401", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const app = createApp({
    authQueryFn: createAuthQueryMock([
      {
        id: 20,
        username: "user20",
        email: "user20@example.com",
        password_hash: passwordHash,
        bio: null,
        profile_picture_url: null
      }
    ]),
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    username: "user20",
    password: "StrongPass1!"
  });
  assert.equal(loginResponse.status, 200);

  const logoutResponse = await agent.post("/api/auth/logout");
  assert.equal(logoutResponse.status, 204);

  const meResponse = await agent.get("/api/auth/me");
  assert.equal(meResponse.status, 401);
  assert.equal(meResponse.body.message, "Unauthorized");
});
