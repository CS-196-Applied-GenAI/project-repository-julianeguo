import crypto from "node:crypto";
import { query as dbQuery } from "../db.js";

export async function createPasswordResetToken(
  userId,
  { queryFn = dbQuery, expiresInMs = 60 * 60 * 1000 } = {}
) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInMs);

  await queryFn("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [
    userId,
    token,
    expiresAt
  ]);

  return { token, expiresAt };
}

export async function findValidToken(token, { queryFn = dbQuery } = {}) {
  const rows = await queryFn(
    "SELECT id, user_id, token, expires_at FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() LIMIT 1",
    [token]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

export async function invalidatePasswordResetToken(token, { queryFn = dbQuery } = {}) {
  await queryFn("DELETE FROM password_reset_tokens WHERE token = ?", [token]);
}
