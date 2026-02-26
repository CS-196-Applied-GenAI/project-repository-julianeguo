import { Router } from "express";
import { query as dbQuery } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export function createRepliesRouter({ queryFn = dbQuery } = {}) {
  const router = Router();

  router.delete("/:id", requireAuth, async (req, res) => {
    try {
      const replyId = Number(req.params.id);
      if (!Number.isInteger(replyId) || replyId <= 0) {
        return res.status(404).json({ message: "Reply not found." });
      }

      const replies = await queryFn("SELECT id, user_id FROM replies WHERE id = ? LIMIT 1", [replyId]);
      if (replies.length === 0) {
        return res.status(404).json({ message: "Reply not found." });
      }

      if (replies[0].user_id !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await queryFn("DELETE FROM replies WHERE id = ?", [replyId]);
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  return router;
}

const repliesRoutes = createRepliesRouter();

export default repliesRoutes;
