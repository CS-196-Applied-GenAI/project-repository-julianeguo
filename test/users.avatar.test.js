import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app.js";

function createAvatarQueryMock(initialUsers = []) {
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

    if (sql.startsWith("UPDATE users SET profile_picture_url = ? WHERE id = ?")) {
      const [profilePictureUrl, userId] = params;
      const user = state.users.find((row) => row.id === userId);
      if (user) {
        user.profile_picture_url = profilePictureUrl;
      }
      return { affectedRows: user ? 1 : 0 };
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

    throw new Error(`Unexpected SQL in users avatar test mock: ${sql}`);
  }

  return { queryFn, state };
}

test("PATCH /api/users/me/avatar updates user avatar and serves static file", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createAvatarQueryMock([
    {
      id: 1,
      username: "viewer_user",
      email: "viewer@example.com",
      bio: "",
      profile_picture_url: null,
      password_hash: passwordHash
    }
  ]);
  const app = createApp({ authQueryFn: queryFn, usersQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/auth/login").send({
    username: "viewer_user",
    password: "StrongPass1!"
  });
  assert.equal(loginResponse.status, 200);

  const imageBuffer = await sharp({
    create: {
      width: 900,
      height: 600,
      channels: 3,
      background: { r: 40, g: 140, b: 220 }
    }
  })
    .png()
    .toBuffer();

  const uploadResponse = await agent
    .patch("/api/users/me/avatar")
    .attach("avatar", imageBuffer, { filename: "avatar.png", contentType: "image/png" });

  assert.equal(uploadResponse.status, 200);
  assert.ok(uploadResponse.body.profile_picture_url);
  assert.ok(uploadResponse.body.profile_picture_url.startsWith("/uploads/profiles/"));

  const meResponse = await agent.get("/api/auth/me");
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.profile_picture_url, uploadResponse.body.profile_picture_url);
  assert.equal(state.users[0].profile_picture_url, uploadResponse.body.profile_picture_url);

  const staticResponse = await agent.get(uploadResponse.body.profile_picture_url);
  assert.equal(staticResponse.status, 200);
  assert.ok(staticResponse.headers["content-type"].startsWith("image/"));

  const savedPath = path.resolve(process.cwd(), uploadResponse.body.profile_picture_url.slice(1));
  assert.equal(fs.existsSync(savedPath), true);
  fs.unlinkSync(savedPath);
});
