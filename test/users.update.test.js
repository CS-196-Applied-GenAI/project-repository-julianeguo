import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createUsersUpdateQueryMock(initialUsers = []) {
  const state = { users: structuredClone(initialUsers) };

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

    if (sql.startsWith("SELECT id, username, email, bio, profile_picture_url FROM users WHERE id")) {
      const [userId] = params;
      return state.users
        .filter((user) => user.id === userId)
        .map((user) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          bio: user.bio ?? null,
          profile_picture_url: user.profile_picture_url ?? null
        }));
    }

    if (sql.startsWith("SELECT id FROM users WHERE LOWER(username)")) {
      const [normalizedUsername] = params;
      return state.users
        .filter((user) => user.username.toLowerCase() === normalizedUsername)
        .map((user) => ({ id: user.id }));
    }

    if (sql.startsWith("UPDATE users SET")) {
      const userId = params[params.length - 1];
      const user = state.users.find((row) => row.id === userId);
      if (!user) {
        return { affectedRows: 0 };
      }

      let paramIndex = 0;
      if (sql.includes("username = ?")) {
        user.username = params[paramIndex];
        paramIndex += 1;
      }
      if (sql.includes("bio = ?")) {
        user.bio = params[paramIndex];
      }
      return { affectedRows: 1 };
    }

    throw new Error(`Unexpected SQL in users update test mock: ${sql}`);
  }

  return { queryFn, state };
}

async function loginAs(agent, username, password) {
  const response = await agent.post("/api/auth/login").send({ username, password });
  assert.equal(response.status, 200);
}

test("PATCH /api/users/me updates bio only and returns updated user", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createUsersUpdateQueryMock([
    { id: 1, username: "viewer_user", email: "viewer@example.com", bio: "", password_hash: passwordHash }
  ]);
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");
  const response = await agent.patch("/api/users/me").send({ bio: "Updated bio" });

  assert.equal(response.status, 200);
  assert.equal(response.body.bio, "Updated bio");
  assert.equal(state.users[0].bio, "Updated bio");
});

test("PATCH /api/users/me updates username to new unique value", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createUsersUpdateQueryMock([
    { id: 1, username: "viewer_user", email: "viewer@example.com", bio: "", password_hash: passwordHash },
    { id: 2, username: "someone_else", email: "other@example.com", bio: "" }
  ]);
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");
  const response = await agent.patch("/api/users/me").send({ username: "New_Name" });

  assert.equal(response.status, 200);
  assert.equal(response.body.username, "new_name");
  assert.equal(state.users[0].username, "new_name");
});

test("PATCH /api/users/me with same username (case-insensitive) succeeds", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createUsersUpdateQueryMock([
    { id: 1, username: "viewer_user", email: "viewer@example.com", bio: "", password_hash: passwordHash }
  ]);
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");
  const response = await agent.patch("/api/users/me").send({ username: "VIEWER_USER" });

  assert.equal(response.status, 200);
  assert.equal(response.body.username, "viewer_user");
  assert.equal(state.users[0].username, "viewer_user");
});

test("PATCH /api/users/me returns 400 when username is already taken by another user", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createUsersUpdateQueryMock([
    { id: 1, username: "viewer_user", email: "viewer@example.com", bio: "", password_hash: passwordHash },
    { id: 2, username: "taken_name", email: "taken@example.com", bio: "" }
  ]);
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");
  const response = await agent.patch("/api/users/me").send({ username: "taken_name" });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Username is already taken.");
  assert.equal(state.users[0].username, "viewer_user");
});

test("PATCH /api/users/me returns 400 when bio exceeds 200 characters", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createUsersUpdateQueryMock([
    { id: 1, username: "viewer_user", email: "viewer@example.com", bio: "", password_hash: passwordHash }
  ]);
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_user", "StrongPass1!");
  const response = await agent.patch("/api/users/me").send({ bio: "a".repeat(201) });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Bio must be 200 characters or fewer.");
  assert.equal(state.users[0].bio, "");
});
