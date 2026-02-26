import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";

function createFollowingFeedQueryMock({
  users = [],
  posts = [],
  retweets = [],
  follows = [],
  blocks = [],
  likes = []
} = {}) {
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

    if (sql.startsWith("SELECT following_id FROM follows WHERE follower_id = ?")) {
      const [viewerId] = params;
      return follows
        .filter((row) => row.follower_id === viewerId)
        .map((row) => ({ following_id: row.following_id }));
    }

    if (sql.startsWith("SELECT") && sql.includes("FROM posts p") && sql.includes("WHERE p.user_id IN")) {
      const viewerId = params[params.length - 2];
      const retweetViewerId = params[params.length - 1];
      const followedIds = params.slice(0, -2);
      return posts
        .filter((post) => followedIds.includes(post.user_id))
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

    if (sql.startsWith("SELECT") && sql.includes("FROM retweets r")) {
      const viewerId = params[params.length - 2];
      const retweetViewerId = params[params.length - 1];
      const followedIds = params.slice(0, -2);
      return retweets
        .filter((retweet) => followedIds.includes(retweet.user_id))
        .map((retweet) => {
          const retweeter = users.find((user) => user.id === retweet.user_id);
          const post = posts.find((row) => row.id === retweet.post_id);
          const originalAuthor = users.find((user) => user.id === post.user_id);
          const likeCount = likes.filter((row) => row.post_id === post.id).length;
          const likedByMe = likes.some((row) => row.post_id === post.id && row.user_id === viewerId);
          const retweetCount = retweets.filter((row) => row.post_id === post.id).length;
          const retweetedByMe = retweets.some(
            (row) => row.post_id === post.id && row.user_id === retweetViewerId
          );
          return {
            retweet_id: retweet.id,
            retweeter_id: retweet.user_id,
            original_post_id: post.id,
            retweeted_at: retweet.created_at,
            retweeter_username: retweeter?.username ?? null,
            retweeter_profile_picture_url: retweeter?.profile_picture_url ?? null,
            original_author_id: post.user_id,
            original_content: post.content,
            original_created_at: post.created_at,
            original_like_count: likeCount,
            original_liked_by_me: likedByMe ? 1 : 0,
            original_retweet_count: retweetCount,
            original_retweeted_by_me: retweetedByMe ? 1 : 0,
            original_author_username: originalAuthor?.username ?? null,
            original_author_profile_picture_url: originalAuthor?.profile_picture_url ?? null
          };
        })
        .sort((a, b) => new Date(b.retweeted_at).getTime() - new Date(a.retweeted_at).getTime());
    }

    throw new Error(`Unexpected SQL in feed following test mock: ${sql}`);
  };
}

async function loginAs(agent, username, password) {
  const response = await agent.post("/api/auth/login").send({ username, password });
  assert.equal(response.status, 200);
}

test("GET /api/feed/following returns followed users' posts/retweets, newest first, max 20, block-aware", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const users = [
    { id: 1, username: "viewer", password_hash: passwordHash },
    { id: 2, username: "followed_a", profile_picture_url: "/uploads/profiles/a.jpg" },
    { id: 3, username: "followed_b", profile_picture_url: "/uploads/profiles/b.jpg" },
    { id: 4, username: "not_followed", profile_picture_url: "/uploads/profiles/c.jpg" },
    { id: 5, username: "blocked_author", profile_picture_url: "/uploads/profiles/d.jpg" }
  ];

  const posts = [
    ...Array.from({ length: 24 }).map((_, index) => ({
      id: index + 1,
      user_id: index % 2 === 0 ? 2 : 3,
      content: `followed-post-${index + 1}`,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, 30 - index)).toISOString()
    })),
    {
      id: 100,
      user_id: 4,
      content: "not-followed-post",
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 1, 0)).toISOString()
    },
    {
      id: 200,
      user_id: 5,
      content: "blocked-author-post",
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 1, 10)).toISOString()
    }
  ];

  const retweets = [
    {
      id: 1,
      user_id: 2,
      post_id: 3,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 1, 20)).toISOString()
    },
    {
      id: 2,
      user_id: 3,
      post_id: 200,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 1, 15)).toISOString()
    },
    {
      id: 3,
      user_id: 4,
      post_id: 2,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 1, 25)).toISOString()
    }
  ];

  const follows = [
    { follower_id: 1, following_id: 2 },
    { follower_id: 1, following_id: 3 }
  ];
  const blocks = [{ blocker_id: 1, blocked_id: 5 }];
  const likes = [
    { user_id: 1, post_id: 3 },
    { user_id: 2, post_id: 3 },
    { user_id: 4, post_id: 2 }
  ];

  const queryFn = createFollowingFeedQueryMock({ users, posts, retweets, follows, blocks, likes });
  const app = createApp({ authQueryFn: queryFn, feedQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.get("/api/feed/following");

  assert.equal(response.status, 200);
  assert.ok(response.body.length <= 20);

  const hasRetweet = response.body.some((item) => item.type === "retweet");
  assert.equal(hasRetweet, true);

  for (const item of response.body) {
    if (item.type === "post") {
      assert.equal([2, 3].includes(item.author.id), true);
      assert.equal(item.post.user_id, item.author.id);
      assert.equal(Object.hasOwn(item.post, "like_count"), true);
      assert.equal(Object.hasOwn(item.post, "liked_by_me"), true);
      assert.equal(Object.hasOwn(item.post, "retweet_count"), true);
      assert.equal(Object.hasOwn(item.post, "retweeted_by_me"), true);
    } else if (item.type === "retweet") {
      assert.equal([2, 3].includes(item.retweeter.id), true);
      assert.ok(item.post.id);
      assert.ok(item.author.id);
      assert.equal(item.author.id === 5, false);
      assert.equal(Object.hasOwn(item.post, "like_count"), true);
      assert.equal(Object.hasOwn(item.post, "liked_by_me"), true);
      assert.equal(Object.hasOwn(item.post, "retweet_count"), true);
      assert.equal(Object.hasOwn(item.post, "retweeted_by_me"), true);
    } else {
      assert.fail("Unexpected feed item type");
    }
  }

  const timestamps = response.body.map((item) =>
    new Date(item.type === "retweet" ? item.retweeted_at : item.post.created_at).getTime()
  );
  for (let i = 1; i < timestamps.length; i += 1) {
    assert.ok(timestamps[i - 1] >= timestamps[i]);
  }
});

test("GET /api/feed/following returns empty array when viewer follows nobody", async () => {
  const passwordHash = await bcrypt.hash("StrongPass1!", 10);
  const users = [{ id: 1, username: "viewer", password_hash: passwordHash }];
  const queryFn = createFollowingFeedQueryMock({ users, posts: [], retweets: [], follows: [], blocks: [] });
  const app = createApp({ authQueryFn: queryFn, feedQueryFn: queryFn, sessionSecret: "test-secret" });
  const agent = request.agent(app);

  await loginAs(agent, "viewer", "StrongPass1!");
  const response = await agent.get("/api/feed/following");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});
