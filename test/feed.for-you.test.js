import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createFeedQueryMock({ users = [], posts = [], blocks = [], likes = [], retweets = [] } = {}) {
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

    if (sql.startsWith("SELECT blocker_id, blocked_id FROM blocks WHERE blocker_id = ? OR blocked_id = ?")) {
      const [viewerId] = params;
      return blocks
        .filter((row) => row.blocker_id === viewerId || row.blocked_id === viewerId)
        .map((row) => ({ blocker_id: row.blocker_id, blocked_id: row.blocked_id }));
    }

    if (sql.startsWith("SELECT") && sql.includes("FROM posts p")) {
      const [viewerId, retweetViewerId] = params;
      return posts
        .map((post) => {
          const author = users.find((user) => user.id === post.user_id);
          const likeCount = likes.filter((row) => row.post_id === post.id).length;
          const likedByMe = likes.some((row) => row.post_id === post.id && row.user_id === viewerId);
          const retweetCount = retweets.filter((row) => row.post_id === post.id).length;
          const retweetedByMe = retweets.some(
            (row) => row.post_id === post.id && row.user_id === retweetViewerId
          );
          return {
            id: post.id,
            user_id: post.user_id,
            content: post.content,
            created_at: post.created_at,
            username: author?.username ?? null,
            profile_picture_url: author?.profile_picture_url ?? null,
            like_count: likeCount,
            liked_by_me: likedByMe ? 1 : 0,
            retweet_count: retweetCount,
            retweeted_by_me: retweetedByMe ? 1 : 0
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    throw new Error(`Unexpected SQL in feed for-you test mock: ${sql}`);
  };
}

async function loginAs(agent, username, password) {
  const response = await agent.post("/api/auth/login").send({ username, password });
  assert.equal(response.status, 200);
}

test("GET /api/feed/for-you returns <=20 newest posts excluding blocked authors", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const users = [
    { id: 1, username: "viewer", password_hash: passwordHash },
    { id: 2, username: "author2", profile_picture_url: "/uploads/profiles/2.jpg" },
    { id: 3, username: "author3", profile_picture_url: "/uploads/profiles/3.jpg" },
    { id: 4, username: "author4", profile_picture_url: "/uploads/profiles/4.jpg" }
  ];

  const posts = Array.from({ length: 25 }).map((_, index) => {
    const authorCycle = [2, 3, 4];
    return {
      id: index + 1,
      user_id: authorCycle[index % authorCycle.length],
      content: `post-${index + 1}`,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, 25 - index)).toISOString()
    };
  });

  const blocks = [{ blocker_id: 1, blocked_id: 3 }];
  const likes = [
    { user_id: 1, post_id: 1 },
    { user_id: 2, post_id: 1 },
    { user_id: 4, post_id: 2 }
  ];
  const retweets = [
    { user_id: 1, post_id: 1 },
    { user_id: 2, post_id: 1 }
  ];
  const queryFn = createFeedQueryMock({ users, posts, blocks, likes, retweets });
  const app = createApp({ authQueryFn: queryFn, feedQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.get("/api/feed/for-you");

  assert.equal(response.status, 200);
  assert.ok(response.body.length <= 20);
  assert.equal(response.body.some((post) => post.user_id === 3), false);

  for (let i = 1; i < response.body.length; i += 1) {
    const previous = new Date(response.body[i - 1].created_at).getTime();
    const current = new Date(response.body[i].created_at).getTime();
    assert.ok(previous >= current);
  }

  assert.equal(response.body.every((post) => post.username && Object.hasOwn(post, "profile_picture_url")), true);
  assert.equal(response.body.every((post) => Object.hasOwn(post, "like_count")), true);
  assert.equal(response.body.every((post) => Object.hasOwn(post, "liked_by_me")), true);
  assert.equal(response.body.every((post) => Object.hasOwn(post, "retweet_count")), true);
  assert.equal(response.body.every((post) => Object.hasOwn(post, "retweeted_by_me")), true);
  assert.equal(response.body.some((post) => Object.hasOwn(post, "retweeter_id")), false);
  assert.equal(response.body.some((post) => Object.hasOwn(post, "type") && post.type === "retweet"), false);
});
