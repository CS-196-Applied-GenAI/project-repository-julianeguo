import { Router } from "express";
import { query as dbQuery } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getBlockedSet } from "../services/block.js";

export function createFeedRouter({ queryFn = dbQuery } = {}) {
  const router = Router();

  router.get("/for-you", requireAuth, async (req, res) => {
    try {
      const viewerId = req.session.userId;
      const blockedSet = await getBlockedSet(viewerId, { queryFn });
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
        ORDER BY p.created_at DESC`,
        [viewerId, viewerId]
      );

      const visiblePosts = posts
        .filter((post) => !blockedSet.has(post.user_id))
        .map((post) => ({
          ...post,
          like_count: Number(post.like_count),
          liked_by_me: Boolean(post.liked_by_me),
          retweet_count: Number(post.retweet_count),
          retweeted_by_me: Boolean(post.retweeted_by_me)
        }))
        .slice(0, 20);

      return res.status(200).json(visiblePosts);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  router.get("/following", requireAuth, async (req, res) => {
    try {
      const viewerId = req.session.userId;
      const blockedSet = await getBlockedSet(viewerId, { queryFn });
      const followedRows = await queryFn("SELECT following_id FROM follows WHERE follower_id = ?", [
        viewerId
      ]);
      const followedIds = followedRows.map((row) => row.following_id);

      if (followedIds.length === 0) {
        return res.status(200).json([]);
      }

      const placeholders = followedIds.map(() => "?").join(", ");
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
        WHERE p.user_id IN (${placeholders})
        ORDER BY p.created_at DESC`,
        [...followedIds, viewerId, viewerId]
      );

      const retweets = await queryFn(
        `SELECT
          r.id AS retweet_id,
          r.user_id AS retweeter_id,
          r.post_id AS original_post_id,
          r.created_at AS retweeted_at,
          ru.username AS retweeter_username,
          ru.profile_picture_url AS retweeter_profile_picture_url,
          p.user_id AS original_author_id,
          p.content AS original_content,
          p.created_at AS original_created_at,
          (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS original_like_count,
          EXISTS (
            SELECT 1
            FROM likes l2
            WHERE l2.post_id = p.id AND l2.user_id = ?
          ) AS original_liked_by_me,
          (SELECT COUNT(*) FROM retweets r2 WHERE r2.post_id = p.id) AS original_retweet_count,
          EXISTS (
            SELECT 1
            FROM retweets r3
            WHERE r3.post_id = p.id AND r3.user_id = ?
          ) AS original_retweeted_by_me,
          au.username AS original_author_username,
          au.profile_picture_url AS original_author_profile_picture_url
        FROM retweets r
        JOIN users ru ON ru.id = r.user_id
        JOIN posts p ON p.id = r.post_id
        JOIN users au ON au.id = p.user_id
        WHERE r.user_id IN (${placeholders})
        ORDER BY r.created_at DESC`,
        [...followedIds, viewerId, viewerId]
      );

      const postItems = posts
        .filter((post) => !blockedSet.has(post.user_id))
        .map((post) => ({
          type: "post",
          timestamp: post.created_at,
          post: {
            id: post.id,
            user_id: post.user_id,
            content: post.content,
            created_at: post.created_at,
            like_count: Number(post.like_count),
            liked_by_me: Boolean(post.liked_by_me),
            retweet_count: Number(post.retweet_count),
            retweeted_by_me: Boolean(post.retweeted_by_me)
          },
          author: {
            id: post.user_id,
            username: post.username,
            profile_picture_url: post.profile_picture_url ?? null
          }
        }));

      const retweetItems = retweets
        .filter(
          (retweet) =>
            !blockedSet.has(retweet.retweeter_id) && !blockedSet.has(retweet.original_author_id)
        )
        .map((retweet) => ({
          type: "retweet",
          timestamp: retweet.retweeted_at,
          retweeted_at: retweet.retweeted_at,
          retweeter: {
            id: retweet.retweeter_id,
            username: retweet.retweeter_username,
            profile_picture_url: retweet.retweeter_profile_picture_url ?? null
          },
          post: {
            id: retweet.original_post_id,
            user_id: retweet.original_author_id,
            content: retweet.original_content,
            created_at: retweet.original_created_at,
            like_count: Number(retweet.original_like_count),
            liked_by_me: Boolean(retweet.original_liked_by_me),
            retweet_count: Number(retweet.original_retweet_count),
            retweeted_by_me: Boolean(retweet.original_retweeted_by_me)
          },
          author: {
            id: retweet.original_author_id,
            username: retweet.original_author_username,
            profile_picture_url: retweet.original_author_profile_picture_url ?? null
          }
        }));

      const feedItems = [...postItems, ...retweetItems]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20)
        .map(({ timestamp, ...item }) => item);

      return res.status(200).json(feedItems);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  return router;
}

const feedRoutes = createFeedRouter();

export default feedRoutes;
