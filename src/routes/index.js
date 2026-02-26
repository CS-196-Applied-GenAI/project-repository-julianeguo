import { Router } from "express";
import healthRoutes from "./health.js";
import pingRoutes from "./ping.js";

const router = Router();

router.use(healthRoutes);
router.use(pingRoutes);

export default router;
