import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createLoginQueryMock(users = []) {
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

    throw new Error(`Unexpected SQL in login test mock: ${sql}`);
  };
}

test("POST /api/auth/login returns 200 and sets session cookie for valid credentials", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const queryFn = createLoginQueryMock([
    { id: 7, username: "valid_user", password_hash: passwordHash }
  ]);
  const app = createApp({ authQueryFn: queryFn, sessionSecret: "test-secret" });

  const response = await request(app).post("/api/auth/login").send({
    username: "VALID_USER",
    password: "StrongPass1!"
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 7, username: "valid_user" });
  assert.equal(Object.hasOwn(response.body, "password"), false);
  assert.equal(Object.hasOwn(response.body, "password_hash"), false);
  assert.ok(Array.isArray(response.headers["set-cookie"]));
  assert.ok(response.headers["set-cookie"][0].includes("connect.sid="));
});

test("POST /api/auth/login returns 401 for wrong password", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const queryFn = createLoginQueryMock([
    { id: 7, username: "valid_user", password_hash: passwordHash }
  ]);
  const app = createApp({ authQueryFn: queryFn, sessionSecret: "test-secret" });

  const response = await request(app).post("/api/auth/login").send({
    username: "valid_user",
    password: "WrongPass1!"
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Invalid credentials.");
});

test("POST /api/auth/login returns 401 for unknown username", async () => {
  const queryFn = createLoginQueryMock([]);
  const app = createApp({ authQueryFn: queryFn, sessionSecret: "test-secret" });

  const response = await request(app).post("/api/auth/login").send({
    username: "missing_user",
    password: "StrongPass1!"
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Invalid credentials.");
});
