import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createPostsQueryMock({ users = [], posts = [], blocks = [], likes = [], retweets = [] } = {}) {
  const state = {
    users: structuredClone(users),
    posts: structuredClone(posts),
    blocks: structuredClone(blocks),
    likes: structuredClone(likes),
    retweets: structuredClone(retweets),
    nextPostId: (posts.reduce((max, post) => Math.max(max, post.id), 0) || 0) + 1
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

    if (sql.startsWith("INSERT INTO posts (user_id, content) VALUES (?, ?)")) {
      const [userId, content] = params;
      const post = {
        id: state.nextPostId,
        user_id: userId,
        content,
        created_at: new Date().toISOString()
      };
      state.posts.push(post);
      state.nextPostId += 1;
      return { insertId: post.id };
    }

    if (sql.startsWith("SELECT id, user_id, content, created_at FROM posts WHERE id = ?")) {
      const [postId] = params;
      return state.posts
        .filter((post) => post.id === postId)
        .map((post) => ({
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          created_at: post.created_at
        }));
    }

    if (sql.startsWith("SELECT id, user_id FROM posts WHERE id = ?")) {
      const [postId] = params;
      return state.posts
        .filter((post) => post.id === postId)
        .map((post) => ({ id: post.id, user_id: post.user_id }));
    }

    if (sql.startsWith("SELECT id FROM posts WHERE id = ?")) {
      const [postId] = params;
      return state.posts
        .filter((post) => post.id === postId)
        .map((post) => ({ id: post.id }));
    }

    if (sql.startsWith("INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)")) {
      const [userId, postId] = params;
      const exists = state.likes.some((row) => row.user_id === userId && row.post_id === postId);
      if (!exists) {
        state.likes.push({ user_id: userId, post_id: postId });
      }
      return { affectedRows: exists ? 0 : 1 };
    }

    if (sql.startsWith("DELETE FROM likes WHERE user_id = ? AND post_id = ?")) {
      const [userId, postId] = params;
      const before = state.likes.length;
      state.likes = state.likes.filter((row) => !(row.user_id === userId && row.post_id === postId));
      return { affectedRows: before - state.likes.length };
    }

    if (sql.startsWith("INSERT IGNORE INTO retweets (user_id, post_id) VALUES (?, ?)")) {
      const [userId, postId] = params;
      const exists = state.retweets.some((row) => row.user_id === userId && row.post_id === postId);
      if (!exists) {
        state.retweets.push({ user_id: userId, post_id: postId });
      }
      return { affectedRows: exists ? 0 : 1 };
    }

    if (sql.startsWith("DELETE FROM retweets WHERE user_id = ? AND post_id = ?")) {
      const [userId, postId] = params;
      const before = state.retweets.length;
      state.retweets = state.retweets.filter(
        (row) => !(row.user_id === userId && row.post_id === postId)
      );
      return { affectedRows: before - state.retweets.length };
    }

    if (sql.startsWith("DELETE FROM posts WHERE id = ?")) {
      const [postId] = params;
      const before = state.posts.length;
      state.posts = state.posts.filter((post) => post.id !== postId);
      return { affectedRows: before - state.posts.length };
    }

    if (sql.startsWith("SELECT") && sql.includes("FROM posts p")) {
      const [viewerId, retweetViewerId, postId] = params;
      const post = state.posts.find((row) => row.id === postId);
      if (!post) {
        return [];
      }

      const author = state.users.find((user) => user.id === post.user_id);
      const likeCount = state.likes.filter((row) => row.post_id === post.id).length;
      const likedByMe = state.likes.some(
        (row) => row.post_id === post.id && row.user_id === viewerId
      );
      const retweetCount = state.retweets.filter((row) => row.post_id === post.id).length;
      const retweetedByMe = state.retweets.some(
        (row) => row.post_id === post.id && row.user_id === retweetViewerId
      );
      return [
        {
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
        }
      ];
    }

    if (sql.startsWith("SELECT blocker_id, blocked_id FROM blocks WHERE blocker_id = ? OR blocked_id = ?")) {
      const [viewerId] = params;
      return state.blocks
        .filter(
          (row) =>
            row.blocker_id === viewerId ||
            row.blocked_id === viewerId
        )
        .map((row) => ({ blocker_id: row.blocker_id, blocked_id: row.blocked_id }));
    }

    throw new Error(`Unexpected SQL in posts routes test mock: ${sql}`);
  }

  return { queryFn, state };
}

async function loginAs(agent, username, password) {
  const response = await agent.post("/api/auth/login").send({ username, password });
  assert.equal(response.status, 200);
}

test("POST /api/posts creates a post and returns 201", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createPostsQueryMock({
    users: [{ id: 1, username: "author_one", password_hash: passwordHash }]
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "author_one", "StrongPass1!");
  const response = await agent.post("/api/posts").send({ content: "Hello world" });

  assert.equal(response.status, 201);
  assert.equal(response.body.user_id, 1);
  assert.equal(response.body.content, "Hello world");
  assert.ok(response.body.id);
  assert.ok(response.body.created_at);
});

test("POST /api/posts returns 400 for invalid post content", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createPostsQueryMock({
    users: [{ id: 1, username: "author_one", password_hash: passwordHash }]
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "author_one", "StrongPass1!");
  const response = await agent.post("/api/posts").send({ content: "" });

  assert.equal(response.status, 400);
});

test("DELETE /api/posts/:id allows owner and returns 204", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createPostsQueryMock({
    users: [{ id: 1, username: "author_one", password_hash: passwordHash }],
    posts: [{ id: 10, user_id: 1, content: "Mine", created_at: new Date().toISOString() }]
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "author_one", "StrongPass1!");
  const response = await agent.delete("/api/posts/10");

  assert.equal(response.status, 204);
  assert.equal(state.posts.length, 0);
});

test("DELETE /api/posts/:id returns 403 for non-owner", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createPostsQueryMock({
    users: [
      { id: 1, username: "viewer_one", password_hash: passwordHash },
      { id: 2, username: "author_two" }
    ],
    posts: [{ id: 20, user_id: 2, content: "Not mine", created_at: new Date().toISOString() }]
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_one", "StrongPass1!");
  const response = await agent.delete("/api/posts/20");

  assert.equal(response.status, 403);
  assert.equal(state.posts.length, 1);
});

test("GET /api/posts/:id returns 200 when post is visible", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createPostsQueryMock({
    users: [
      { id: 1, username: "viewer_one", password_hash: passwordHash },
      { id: 2, username: "author_two", profile_picture_url: "/uploads/profiles/a.jpg" }
    ],
    posts: [{ id: 30, user_id: 2, content: "Visible post", created_at: new Date().toISOString() }],
    blocks: []
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_one", "StrongPass1!");
  const response = await agent.get("/api/posts/30");

  assert.equal(response.status, 200);
  assert.equal(response.body.id, 30);
  assert.equal(response.body.username, "author_two");
  assert.equal(response.body.like_count, 0);
  assert.equal(response.body.liked_by_me, false);
  assert.equal(response.body.retweet_count, 0);
  assert.equal(response.body.retweeted_by_me, false);
});

test("GET /api/posts/:id returns 404 when blocked", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createPostsQueryMock({
    users: [
      { id: 1, username: "viewer_one", password_hash: passwordHash },
      { id: 2, username: "author_two" }
    ],
    posts: [{ id: 40, user_id: 2, content: "Hidden post", created_at: new Date().toISOString() }],
    blocks: [{ blocker_id: 1, blocked_id: 2 }]
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_one", "StrongPass1!");
  const response = await agent.get("/api/posts/40");

  assert.equal(response.status, 404);
});

test("POST /api/posts/:id/like is idempotent and GET includes like state", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createPostsQueryMock({
    users: [
      { id: 1, username: "viewer_one", password_hash: passwordHash },
      { id: 2, username: "author_two" }
    ],
    posts: [{ id: 50, user_id: 2, content: "Likable", created_at: new Date().toISOString() }],
    likes: []
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_one", "StrongPass1!");
  const likeResponse1 = await agent.post("/api/posts/50/like");
  const likeResponse2 = await agent.post("/api/posts/50/like");

  assert.equal(likeResponse1.status, 204);
  assert.equal(likeResponse2.status, 204);
  assert.equal(state.likes.length, 1);

  const postResponse = await agent.get("/api/posts/50");
  assert.equal(postResponse.status, 200);
  assert.equal(postResponse.body.like_count, 1);
  assert.equal(postResponse.body.liked_by_me, true);
});

test("DELETE /api/posts/:id/like removes like and GET reflects zero state", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createPostsQueryMock({
    users: [
      { id: 1, username: "viewer_one", password_hash: passwordHash },
      { id: 2, username: "author_two" }
    ],
    posts: [{ id: 60, user_id: 2, content: "Unlike me", created_at: new Date().toISOString() }],
    likes: [{ user_id: 1, post_id: 60 }]
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_one", "StrongPass1!");
  const unlikeResponse = await agent.delete("/api/posts/60/like");
  assert.equal(unlikeResponse.status, 204);
  assert.equal(state.likes.length, 0);

  const postResponse = await agent.get("/api/posts/60");
  assert.equal(postResponse.status, 200);
  assert.equal(postResponse.body.like_count, 0);
  assert.equal(postResponse.body.liked_by_me, false);
});

test("POST /api/posts/:id/retweet is idempotent and GET includes retweet state", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createPostsQueryMock({
    users: [
      { id: 1, username: "viewer_one", password_hash: passwordHash },
      { id: 2, username: "author_two" }
    ],
    posts: [{ id: 70, user_id: 2, content: "Retweet me", created_at: new Date().toISOString() }],
    retweets: []
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_one", "StrongPass1!");
  const retweetResponse1 = await agent.post("/api/posts/70/retweet");
  const retweetResponse2 = await agent.post("/api/posts/70/retweet");

  assert.equal(retweetResponse1.status, 204);
  assert.equal(retweetResponse2.status, 204);
  assert.equal(state.retweets.length, 1);

  const postResponse = await agent.get("/api/posts/70");
  assert.equal(postResponse.status, 200);
  assert.equal(postResponse.body.retweet_count, 1);
  assert.equal(postResponse.body.retweeted_by_me, true);
});

test("DELETE /api/posts/:id/retweet removes retweet and GET reflects zero state", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn, state } = createPostsQueryMock({
    users: [
      { id: 1, username: "viewer_one", password_hash: passwordHash },
      { id: 2, username: "author_two" }
    ],
    posts: [{ id: 80, user_id: 2, content: "Unretweet me", created_at: new Date().toISOString() }],
    retweets: [{ user_id: 1, post_id: 80 }]
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_one", "StrongPass1!");
  const unretweetResponse = await agent.delete("/api/posts/80/retweet");
  assert.equal(unretweetResponse.status, 204);
  assert.equal(state.retweets.length, 0);

  const postResponse = await agent.get("/api/posts/80");
  assert.equal(postResponse.status, 200);
  assert.equal(postResponse.body.retweet_count, 0);
  assert.equal(postResponse.body.retweeted_by_me, false);
});

test("GET /api/posts/:id returns 404 for missing post", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createPostsQueryMock({
    users: [{ id: 1, username: "viewer_one", password_hash: passwordHash }]
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_one", "StrongPass1!");
  const response = await agent.get("/api/posts/999");

  assert.equal(response.status, 404);
});

test("post route actions return 404 for invalid post id param", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const { queryFn } = createPostsQueryMock({
    users: [{ id: 1, username: "viewer_one", password_hash: passwordHash }],
    posts: [{ id: 1, user_id: 1, content: "x", created_at: new Date().toISOString() }]
  });
  const app = createApp({ authQueryFn: queryFn, postsQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer_one", "StrongPass1!");

  const getResponse = await agent.get("/api/posts/not-a-number");
  const likeResponse = await agent.post("/api/posts/not-a-number/like");
  const retweetResponse = await agent.post("/api/posts/not-a-number/retweet");
  const deleteResponse = await agent.delete("/api/posts/not-a-number");

  assert.equal(getResponse.status, 404);
  assert.equal(likeResponse.status, 404);
  assert.equal(retweetResponse.status, 404);
  assert.equal(deleteResponse.status, 404);
});
