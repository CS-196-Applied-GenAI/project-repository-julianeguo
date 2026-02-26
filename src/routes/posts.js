import { Router } from "express";
import { query as dbQuery } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getBlockedSet } from "../services/block.js";
import { validatePostContent } from "../validation/post.js";

export function createPostsRouter({ queryFn = dbQuery } = {}) {
  const router = Router();

  router.post("/", requireAuth, async (req, res) => {
    try {
      const { content } = req.body ?? {};
      const contentValidation = validatePostContent(content);
      if (!contentValidation.valid) {
        return res.status(400).json(contentValidation);
      }

      const insertResult = await queryFn("INSERT INTO posts (user_id, content) VALUES (?, ?)", [
        req.session.userId,
        content
      ]);
      const posts = await queryFn(
        "SELECT id, user_id, content, created_at FROM posts WHERE id = ? LIMIT 1",
        [insertResult.insertId]
      );

      return res.status(201).json(posts[0]);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.delete("/:id", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      const posts = await queryFn("SELECT id, user_id FROM posts WHERE id = ? LIMIT 1", [postId]);
      if (posts.length === 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      if (posts[0].user_id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await queryFn("DELETE FROM posts WHERE id = ?", [postId]);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.post("/:id/like", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      const posts = await queryFn("SELECT id FROM posts WHERE id = ? LIMIT 1", [postId]);
      if (posts.length === 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      await queryFn("INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)", [
        req.session.userId,
        postId
      ]);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.delete("/:id/like", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      await queryFn("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [
        req.session.userId,
        postId
      ]);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.post("/:id/retweet", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      const posts = await queryFn("SELECT id FROM posts WHERE id = ? LIMIT 1", [postId]);
      if (posts.length === 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      await queryFn("INSERT IGNORE INTO retweets (user_id, post_id) VALUES (?, ?)", [
        req.session.userId,
        postId
      ]);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.delete("/:id/retweet", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      await queryFn("DELETE FROM retweets WHERE user_id = ? AND post_id = ?", [
        req.session.userId,
        postId
      ]);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.post("/:id/replies", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      const { content } = req.body ?? {};
      const contentValidation = validatePostContent(content);
      if (!contentValidation.valid) {
        return res.status(400).json(contentValidation);
      }

      const parentPost = await queryFn("SELECT id FROM posts WHERE id = ? LIMIT 1", [postId]);
      if (parentPost.length === 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      const insertResult = await queryFn(
        "INSERT INTO replies (user_id, parent_post_id, content) VALUES (?, ?, ?)",
        [req.session.userId, postId, content]
      );
      const replies = await queryFn(
        "SELECT id, user_id, parent_post_id, content, created_at FROM replies WHERE id = ? LIMIT 1",
        [insertResult.insertId]
      );

      return res.status(201).json(replies[0]);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.get("/:id/replies", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      const parentPost = await queryFn("SELECT id FROM posts WHERE id = ? LIMIT 1", [postId]);
      if (parentPost.length === 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      const blockedSet = await getBlockedSet(req.session.userId, { queryFn });
      const replies = await queryFn(
        `SELECT
          r.id,
          r.user_id,
          r.parent_post_id,
          r.content,
          r.created_at,
          u.username,
          u.profile_picture_url
        FROM replies r
        JOIN users u ON u.id = r.user_id
        WHERE r.parent_post_id = ?
        ORDER BY r.created_at ASC`,
        [postId]
      );

      return res.status(200).json(replies.filter((reply) => !blockedSet.has(reply.user_id)));
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      const posts = await queryFn(
        `SELECT
          p.id,
          p.user_id,
          p.content,
          p.created_at,
          u.username,
          u.profile_picture_url,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
          EXISTS (
            SELECT 1
            FROM likes l2
            WHERE l2.post_id = p.id AND l2.user_id = ?
          ) AS liked_by_me,
          (SELECT COUNT(*) FROM retweets r WHERE r.post_id = p.id) AS retweet_count,
          EXISTS (
            SELECT 1
            FROM retweets r2
            WHERE r2.post_id = p.id AND r2.user_id = ?
          ) AS retweeted_by_me
        FROM posts p
        JOIN users u ON u.id = p.user_id
        WHERE p.id = ?
        LIMIT 1`,
        [req.session.userId, req.session.userId, postId]
      );

      if (posts.length === 0) {
        return res.status(404).json({ message: "Post not found." });
      }

      const post = posts[0];
      const blockedSet = await getBlockedSet(req.session.userId, { queryFn });
      if (blockedSet.has(post.user_id)) {
        return res.status(404).json({ message: "Post not found." });
      }

      return res.status(200).json({
        ...post,
        like_count: Number(post.like_count),
        liked_by_me: Boolean(post.liked_by_me),
        retweet_count: Number(post.retweet_count),
        retweeted_by_me: Boolean(post.retweeted_by_me)
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  return router;
}

const postsRoutes = createPostsRouter();

export default postsRoutes;
