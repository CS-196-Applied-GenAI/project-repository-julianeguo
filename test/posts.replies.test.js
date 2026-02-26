import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createRepliesQueryMock({ users = [], posts = [], replies = [], blocks = [] } = {}) {
  const state = {
    users: structuredClone(users),
    posts: structuredClone(posts),
    replies: structuredClone(replies),
    blocks: structuredClone(blocks),
    nextReplyId: (replies.reduce((max, reply) => Math.max(max, reply.id), 0) || 0) + 1
  };

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

    if (sql.startsWith("SELECT id FROM posts WHERE id = ?")) {
      const [postId] = params;
      return state.posts.filter((post) => post.id === postId).map((post) => ({ id: post.id }));
    }

    if (sql.startsWith("INSERT INTO replies (user_id, parent_post_id, content) VALUES (?, ?, ?)")) {
      const [userId, parentPostId, content] = params;
      const reply = {
        id: state.nextReplyId,
        user_id: userId,
        parent_post_id: parentPostId,
        content,
        created_at: new Date().toISOString()
      };
      state.replies.push(reply);
      state.nextReplyId += 1;
      return { insertId: reply.id };
    }

    if (sql.startsWith("SELECT id, user_id, parent_post_id, content, created_at FROM replies WHERE id = ?")) {
      const [replyId] = params;
      return state.replies
        .filter((reply) => reply.id === replyId)
        .map((reply) => ({
          id: reply.id,
          user_id: reply.user_id,
          parent_post_id: reply.parent_post_id,
          content: reply.content,
          created_at: reply.created_at
        }));
    }

    if (sql.startsWith("SELECT id, user_id FROM replies WHERE id = ?")) {
      const [replyId] = params;
      return state.replies
        .filter((reply) => reply.id === replyId)
        .map((reply) => ({ id: reply.id, user_id: reply.user_id }));
    }

    if (sql.startsWith("DELETE FROM replies WHERE id = ?")) {
      const [replyId] = params;
      const before = state.replies.length;
      state.replies = state.replies.filter((reply) => reply.id !== replyId);
      return { affectedRows: before - state.replies.length };
    }

    if (sql.startsWith("SELECT") && sql.includes("FROM replies r")) {
      const [postId] = params;
      return state.replies
        .filter((reply) => reply.parent_post_id === postId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((reply) => {
          const author = state.users.find((user) => user.id === reply.user_id);
          return {
            id: reply.id,
            user_id: reply.user_id,
            parent_post_id: reply.parent_post_id,
            content: reply.content,
            created_at: reply.created_at,
            username: author?.username ?? null,
            profile_picture_url: author?.profile_picture_url ?? null
          };
        });
    }

    if (sql.startsWith("SELECT blocker_id, blocked_id FROM blocks WHERE blocker_id = ? OR blocked_id = ?")) {
      const [viewerId] = params;
      return state.blocks
        .filter((row) => row.blocker_id === viewerId || row.blocked_id === viewerId)
        .map((row) => ({ blocker_id: row.blocker_id, blocked_id: row.blocked_id }));
    }

    throw new Error(`Unexpected SQL in posts replies test mock: ${sql}`);
  }

  return { queryFn, state };
}

async function loginAs(agent, username, password) {
  const response = await agent.post("/api/auth/login").send({ username, password });
  assert.equal(response.status, 200);
}

test("POST /api/posts/:id/replies creates reply and returns 201", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createRepliesQueryMock({
    users: [{ id: 1, username: "viewer", password_hash: passwordHash }],
    posts: [{ id: 10, user_id: 2, content: "parent", created_at: new Date().toISOString() }]
  });
  const app = createApp({
    authQueryFn: queryFn,
    postsQueryFn: queryFn,
    repliesQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.post("/api/posts/10/replies").send({ content: "first reply" });

  assert.equal(response.status, 201);
  assert.equal(response.body.user_id, 1);
  assert.equal(response.body.parent_post_id, 10);
  assert.equal(response.body.content, "first reply");
});

test("POST /api/posts/:id/replies returns 400 for empty content", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createRepliesQueryMock({
    users: [{ id: 1, username: "viewer", password_hash: passwordHash }],
    posts: [{ id: 10, user_id: 2, content: "parent", created_at: new Date().toISOString() }]
  });
  const app = createApp({
    authQueryFn: queryFn,
    postsQueryFn: queryFn,
    repliesQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.post("/api/posts/10/replies").send({ content: "" });

  assert.equal(response.status, 400);
});

test("POST /api/posts/:id/replies returns 400 for content over 280 chars", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createRepliesQueryMock({
    users: [{ id: 1, username: "viewer", password_hash: passwordHash }],
    posts: [{ id: 10, user_id: 2, content: "parent", created_at: new Date().toISOString() }]
  });
  const app = createApp({
    authQueryFn: queryFn,
    postsQueryFn: queryFn,
    repliesQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.post("/api/posts/10/replies").send({ content: "a".repeat(281) });

  assert.equal(response.status, 400);
});

test("POST /api/posts/:id/replies returns 404 for missing post", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createRepliesQueryMock({
    users: [{ id: 1, username: "viewer", password_hash: passwordHash }],
    posts: []
  });
  const app = createApp({
    authQueryFn: queryFn,
    postsQueryFn: queryFn,
    repliesQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.post("/api/posts/999/replies").send({ content: "reply" });

  assert.equal(response.status, 404);
});

test("GET /api/posts/:id/replies returns replies oldest first", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createRepliesQueryMock({
    users: [
      { id: 1, username: "viewer", password_hash: passwordHash },
      { id: 2, username: "author_a", profile_picture_url: "/uploads/profiles/a.jpg" },
      { id: 3, username: "author_b", profile_picture_url: "/uploads/profiles/b.jpg" }
    ],
    posts: [{ id: 10, user_id: 4, content: "parent", created_at: new Date().toISOString() }],
    replies: [
      { id: 2, user_id: 3, parent_post_id: 10, content: "second", created_at: "2026-01-01T00:00:02.000Z" },
      { id: 1, user_id: 2, parent_post_id: 10, content: "first", created_at: "2026-01-01T00:00:01.000Z" }
    ]
  });
  const app = createApp({
    authQueryFn: queryFn,
    postsQueryFn: queryFn,
    repliesQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.get("/api/posts/10/replies");

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 2);
  assert.equal(response.body[0].content, "first");
  assert.equal(response.body[1].content, "second");
});

test("GET /api/posts/:id/replies omits replies from blocked users in both directions", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createRepliesQueryMock({
    users: [
      { id: 1, username: "viewer", password_hash: passwordHash },
      { id: 2, username: "blocked_by_viewer" },
      { id: 3, username: "blocks_viewer" },
      { id: 4, username: "visible_user" }
    ],
    posts: [{ id: 10, user_id: 5, content: "parent", created_at: new Date().toISOString() }],
    replies: [
      { id: 1, user_id: 2, parent_post_id: 10, content: "hidden-1", created_at: "2026-01-01T00:00:01.000Z" },
      { id: 2, user_id: 3, parent_post_id: 10, content: "hidden-2", created_at: "2026-01-01T00:00:02.000Z" },
      { id: 3, user_id: 4, parent_post_id: 10, content: "visible", created_at: "2026-01-01T00:00:03.000Z" }
    ],
    blocks: [
      { blocker_id: 1, blocked_id: 2 },
      { blocker_id: 3, blocked_id: 1 }
    ]
  });
  const app = createApp({
    authQueryFn: queryFn,
    postsQueryFn: queryFn,
    repliesQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.get("/api/posts/10/replies");

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].content, "visible");
});

test("DELETE /api/replies/:id deletes own reply and returns 204", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createRepliesQueryMock({
    users: [{ id: 1, username: "viewer", password_hash: passwordHash }],
    replies: [{ id: 50, user_id: 1, parent_post_id: 10, content: "mine", created_at: new Date().toISOString() }]
  });
  const app = createApp({
    authQueryFn: queryFn,
    postsQueryFn: queryFn,
    repliesQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.delete("/api/replies/50");

  assert.equal(response.status, 204);
  assert.equal(state.replies.length, 0);
});

test("DELETE /api/replies/:id returns 403 for non-owner", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createRepliesQueryMock({
    users: [{ id: 1, username: "viewer", password_hash: passwordHash }],
    replies: [
      { id: 60, user_id: 2, parent_post_id: 10, content: "not mine", created_at: new Date().toISOString() }
    ]
  });
  const app = createApp({
    authQueryFn: queryFn,
    postsQueryFn: queryFn,
    repliesQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.delete("/api/replies/60");

  assert.equal(response.status, 403);
  assert.equal(state.replies.length, 1);
});

test("DELETE /api/replies/:id returns 404 for missing reply", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createRepliesQueryMock({
    users: [{ id: 1, username: "viewer", password_hash: passwordHash }],
    replies: []
  });
  const app = createApp({
    authQueryFn: queryFn,
    postsQueryFn: queryFn,
    repliesQueryFn: queryFn,
    sessionSecret: "test-secret"
  });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.delete("/api/replies/999");

  assert.equal(response.status, 404);
});
