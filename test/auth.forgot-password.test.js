import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sendPasswordResetEmail } from "../src/services/email.js";
import { createPasswordResetToken } from "../src/services/passwordResetToken.js";

function createForgotPasswordQueryMock(users = []) {
  const resetTokens = [];

  async function queryFn(sql, params = []) {
    if (sql.startsWith("SELECT id, email FROM users WHERE email")) {
      const [email] = params;
      return users.filter((user) => user.email === email).map((user) => ({ id: user.id, email }));
    }

    if (sql.startsWith("INSERT INTO password_reset_tokens")) {
      const [userId, token, expiresAt] = params;
      resetTokens.push({ user_id: userId, token, expires_at: expiresAt });
      return { insertId: resetTokens.length };
    }

    throw new Error(`Unexpected SQL in forgot-password test mock: ${sql}`);
  }

  return { queryFn, resetTokens };
}

test("POST /api/auth/forgot-password returns 200, stores token, and logs reset link in log mode", async () => {
  const previousLogOnly = process.env.LOG_EMAIL_ONLY;
  try {
    process.env.LOG_EMAIL_ONLY = "true";

    const logs = [];
    const logger = { log: (line) => logs.push(line) };
    const { queryFn, resetTokens } = createForgotPasswordQueryMock([
      { id: 9, email: "known@example.com" }
    ]);
    const app = createApp({
      authQueryFn: queryFn,
      authCreateTokenFn: createPasswordResetToken,
      authSendResetEmailFn: (email, resetLink) =>
        sendPasswordResetEmail(email, resetLink, { logger }),
      frontendUrl: "http://frontend.test",
      sessionSecret: "test-secret"
    });

    const response = await request(app).post("/api/auth/forgot-password").send({
      email: "known@example.com"
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "If an account exists, you will receive an email.");
    assert.equal(resetTokens.length, 1);
    assert.equal(resetTokens[0].user_id, 9);
    assert.ok(logs.length > 0);
    assert.ok(logs[0].includes("Password reset link for known@example.com:"));
    assert.ok(logs[0].includes("/reset-password?token="));
    assert.ok(logs[0].includes(resetTokens[0].token));
  } finally {
    process.env.LOG_EMAIL_ONLY = previousLogOnly;
  }
});

test("POST /api/auth/forgot-password with unknown email still returns 200 and stores no token", async () => {
  const { queryFn, resetTokens } = createForgotPasswordQueryMock([]);
  const app = createApp({
    authQueryFn: queryFn,
    authCreateTokenFn: createPasswordResetToken,
    authSendResetEmailFn: async () => ({ logged: true }),
    frontendUrl: "http://frontend.test",
    sessionSecret: "test-secret"
  });

  const response = await request(app).post("/api/auth/forgot-password").send({
    email: "unknown@example.com"
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "If an account exists, you will receive an email.");
  assert.equal(resetTokens.length, 0);
});
