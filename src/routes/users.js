import { Router } from "express";
import { query as dbQuery } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { avatarUploadMiddleware, resizeAvatarImage } from "../middleware/upload.js";
import { validateBio, validateUsername } from "../validation/auth.js";

export function createUsersRouter({ queryFn = dbQuery } = {}) {
  const router = Router();

  router.get("/by-username/:username", requireAuth, async (req, res) => {
    try {
      const usernameParam = req.params.username;
      if (typeof usernameParam !== "string" || usernameParam.trim().length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const normalizedUsername = usernameParam.trim().toLowerCase();
      const users = await queryFn(
        `SELECT
          u.id,
          u.username,
          u.bio,
          u.profile_picture_url,
          (SELECT COUNT(*) FROM follows f1 WHERE f1.following_id = u.id) AS follower_count,
          (SELECT COUNT(*) FROM follows f2 WHERE f2.follower_id = u.id) AS following_count,
          EXISTS (
            SELECT 1
            FROM follows f3
            WHERE f3.follower_id = ? AND f3.following_id = u.id
          ) AS is_following
        FROM users u
        WHERE LOWER(u.username) = ?
        LIMIT 1`,
        [req.session.userId, normalizedUsername]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = users[0];
      return res.status(200).json({
        id: user.id,
        username: user.username,
        bio: user.bio ?? null,
        profile_picture_url: user.profile_picture_url ?? null,
        follower_count: Number(user.follower_count),
        following_count: Number(user.following_count),
        is_following: Boolean(user.is_following)
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.get("/:id/posts", requireAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const users = await queryFn("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);
      if (users.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const posts = await queryFn(
        `SELECT
          p.id,
          p.user_id,
          p.content,
          p.created_at,
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
          ) AS retweeted_by_me,
          (SELECT COUNT(*) FROM replies re WHERE re.parent_post_id = p.id) AS reply_count
        FROM posts p
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC`,
        [req.session.userId, req.session.userId, userId]
      );

      return res.status(200).json(
        posts.map((post) => ({
          id: post.id,
          user_id: post.user_id,
          content: post.content,
          created_at: post.created_at,
          like_count: Number(post.like_count),
          liked_by_me: Boolean(post.liked_by_me),
          retweet_count: Number(post.retweet_count),
          retweeted_by_me: Boolean(post.retweeted_by_me),
          reply_count: Number(post.reply_count)
        }))
      );
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.post("/:id/block", requireAuth, async (req, res) => {
    try {
      const targetUserId = Number(req.params.id);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(404).json({ message: "User not found." });
      }

      if (targetUserId === req.session.userId) {
        return res.status(400).json({ message: "You cannot block yourself." });
      }

      const targetUsers = await queryFn("SELECT id FROM users WHERE id = ? LIMIT 1", [targetUserId]);
      if (targetUsers.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      await queryFn("INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)", [
        req.session.userId,
        targetUserId
      ]);
      await queryFn("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [
        req.session.userId,
        targetUserId
      ]);
      await queryFn("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [
        targetUserId,
        req.session.userId
      ]);

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.delete("/:id/block", requireAuth, async (req, res) => {
    try {
      const targetUserId = Number(req.params.id);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(404).json({ message: "User not found." });
      }

      await queryFn("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?", [
        req.session.userId,
        targetUserId
      ]);

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.post("/:id/follow", requireAuth, async (req, res) => {
    try {
      const targetUserId = Number(req.params.id);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(404).json({ message: "User not found." });
      }

      if (targetUserId === req.session.userId) {
        return res.status(400).json({ message: "You cannot follow yourself." });
      }

      const targetUsers = await queryFn("SELECT id FROM users WHERE id = ? LIMIT 1", [targetUserId]);
      if (targetUsers.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      await queryFn("INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)", [
        req.session.userId,
        targetUserId
      ]);

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.delete("/:id/follow", requireAuth, async (req, res) => {
    try {
      const targetUserId = Number(req.params.id);
      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(404).json({ message: "User not found." });
      }

      await queryFn("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", [
        req.session.userId,
        targetUserId
      ]);

      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.patch("/me/avatar", requireAuth, avatarUploadMiddleware, resizeAvatarImage, async (req, res) => {
    try {
      if (!req.file?.filename) {
        return res.status(400).json({ message: "Avatar file is required." });
      }

      const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;
      await queryFn("UPDATE users SET profile_picture_url = ? WHERE id = ?", [
        profilePictureUrl,
        req.session.userId
      ]);

      const updatedUsers = await queryFn(
        "SELECT id, username, email, bio, profile_picture_url FROM users WHERE id = ? LIMIT 1",
        [req.session.userId]
      );

      if (updatedUsers.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const updatedUser = updatedUsers[0];
      return res.status(200).json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio ?? null,
        profile_picture_url: updatedUser.profile_picture_url ?? null
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.patch("/me", requireAuth, async (req, res) => {
    try {
      const currentUsers = await queryFn(
        "SELECT id, username, email, bio, profile_picture_url FROM users WHERE id = ? LIMIT 1",
        [req.session.userId]
      );

      if (currentUsers.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const currentUser = currentUsers[0];
      const { username, bio } = req.body ?? {};
      const updates = {};

      if (username !== undefined) {
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
          return res.status(400).json(usernameValidation);
        }

        const normalizedUsername = username.toLowerCase();
        if (normalizedUsername !== currentUser.username.toLowerCase()) {
          const existingUsers = await queryFn(
            "SELECT id FROM users WHERE LOWER(username) = ? LIMIT 1",
            [normalizedUsername]
          );
          if (existingUsers.length > 0) {
            return res.status(400).json({ message: "Username is already taken." });
          }
        }

        updates.username = normalizedUsername;
      }

      if (bio !== undefined) {
        const bioValidation = validateBio(bio);
        if (!bioValidation.valid) {
          return res.status(400).json(bioValidation);
        }
        updates.bio = bio;
      }

      const fields = Object.keys(updates);
      if (fields.length > 0) {
        const setClause = fields.map((field) => `${field} = ?`).join(", ");
        const values = fields.map((field) => updates[field]);
        await queryFn(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, req.session.userId]);
      }

      const updatedUsers = await queryFn(
        "SELECT id, username, email, bio, profile_picture_url FROM users WHERE id = ? LIMIT 1",
        [req.session.userId]
      );
      const updatedUser = updatedUsers[0];

      return res.status(200).json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio ?? null,
        profile_picture_url: updatedUser.profile_picture_url ?? null
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const users = await queryFn(
        `SELECT
          u.id,
          u.username,
          u.bio,
          u.profile_picture_url,
          (SELECT COUNT(*) FROM follows f1 WHERE f1.following_id = u.id) AS follower_count,
          (SELECT COUNT(*) FROM follows f2 WHERE f2.follower_id = u.id) AS following_count,
          EXISTS (
            SELECT 1
            FROM follows f3
            WHERE f3.follower_id = ? AND f3.following_id = u.id
          ) AS is_following
        FROM users u
        WHERE u.id = ?
        LIMIT 1`,
        [req.session.userId, userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      const user = users[0];
      return res.status(200).json({
        id: user.id,
        username: user.username,
        bio: user.bio ?? null,
        profile_picture_url: user.profile_picture_url ?? null,
        follower_count: Number(user.follower_count),
        following_count: Number(user.following_count),
        is_following: Boolean(user.is_following)
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  return router;
}

const usersRoutes = createUsersRouter();

export default usersRoutes;
