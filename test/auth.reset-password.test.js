import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createResetPasswordQueryMock({ users = [], tokens = [] } = {}) {
  const state = {
    users: [...users],
    tokens: [...tokens]
  };

  async function queryFn(sql, params = []) {
    if (
      sql.startsWith(
        "SELECT id, user_id, token, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()"
      )
    ) {
      const [token] = params;
      const now = new Date();
      return state.tokens
        .filter((row) => row.token === token && new Date(row.expires_at) > now)
        .map((row) => ({
          id: row.id,
          user_id: row.user_id,
          token: row.token,
          expires_at: row.expires_at
        }));
    }

    if (sql.startsWith("UPDATE users SET password_hash = ? WHERE id = ?")) {
      const [passwordHash, userId] = params;
      const user = state.users.find((row) => row.id === userId);
      if (user) {
        user.password_hash = passwordHash;
      }
      return { affectedRows: user ? 1 : 0 };
    }

    if (sql.startsWith("DELETE FROM password_reset_tokens WHERE token = ?")) {
      const [token] = params;
      const before = state.tokens.length;
      state.tokens = state.tokens.filter((row) => row.token !== token);
      return { affectedRows: before - state.tokens.length };
    }

    throw new Error(`Unexpected SQL in reset-password test mock: ${sql}`);
  }

  return { queryFn, state };
}

test("POST /api/auth/reset-password with valid token and strong password returns 204 and updates password", async () => {
  const oldPasswordHash = await bcrypt.hash("OldPass1!", 10);
  const { queryFn, state } = createResetPasswordQueryMock({
    users: [{ id: 5, password_hash: oldPasswordHash }],
    tokens: [
      {
        id: 1,
        user_id: 5,
        token: "valid-token",
        expires_at: new Date(Date.now() + 10 * 60 * 1000)
      }
    ]
  });
  const app = createApp({ authQueryFn: queryFn, sessionSecret: "test-secret" });

  const response = await request(app).post("/api/auth/reset-password").send({
    token: "valid-token",
    newPassword: "NewStrong1!"
  });

  assert.equal(response.status, 204);
  assert.equal(await bcrypt.compare("NewStrong1!", state.users[0].password_hash), true);
  assert.equal(state.tokens.length, 0);
});

test("POST /api/auth/reset-password with invalid token returns 400", async () => {
  const { queryFn } = createResetPasswordQueryMock({
    users: [{ id: 5, password_hash: "hash" }],
    tokens: []
  });
  const app = createApp({ authQueryFn: queryFn, sessionSecret: "test-secret" });

  const response = await request(app).post("/api/auth/reset-password").send({
    token: "missing-token",
    newPassword: "NewStrong1!"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Invalid or expired token.");
});

test("POST /api/auth/reset-password with expired token returns 400", async () => {
  const { queryFn } = createResetPasswordQueryMock({
    users: [{ id: 8, password_hash: "hash" }],
    tokens: [
      {
        id: 2,
        user_id: 8,
        token: "expired-token",
        expires_at: new Date(Date.now() - 60 * 1000)
      }
    ]
  });
  const app = createApp({ authQueryFn: queryFn, sessionSecret: "test-secret" });

  const response = await request(app).post("/api/auth/reset-password").send({
    token: "expired-token",
    newPassword: "NewStrong1!"
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Invalid or expired token.");
});

test("POST /api/auth/reset-password with weak password returns 400", async () => {
  const { queryFn, state } = createResetPasswordQueryMock({
    users: [{ id: 6, password_hash: "old-hash" }],
    tokens: [
      {
        id: 3,
        user_id: 6,
        token: "valid-token-2",
        expires_at: new Date(Date.now() + 10 * 60 * 1000)
      }
    ]
  });
  const app = createApp({ authQueryFn: queryFn, sessionSecret: "test-secret" });

  const response = await request(app).post("/api/auth/reset-password").send({
    token: "valid-token-2",
    newPassword: "weakpass"
  });

  assert.equal(response.status, 400);
  assert.equal(state.users[0].password_hash, "old-hash");
  assert.equal(state.tokens.length, 1);
});
