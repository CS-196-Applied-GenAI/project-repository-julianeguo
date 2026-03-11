import { Router } from "express";
import { query } from "../db.js";

const router = Router();

router.get("/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.status(200).json({ ok: true, db: "ok" });
  } catch (error) {
    res.status(503).json({ ok: false, db: "unavailable" });
  }
});

export default router;
