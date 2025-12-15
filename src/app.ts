import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

import { supabase } from "./config/supabase.client";
import { swaggerConfigs } from "./config/swagger";
import authRouter from "./routes/auth.routes";
import importRoutes from "./routes/import.routes";
import treeRoutes from "./routes/trees.routes";

const app = express();
app.use(cookieParser());
app.use(express.json());

const BASE_PATH = process.env.BASE_PATH ?? "";

const router = express.Router();
app.use(BASE_PATH, router);

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health probe for orchestration.
 *     security: []
 *     responses:
 *       '200':
 *         description: Application is responsive.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "urban-tree-server" });
});

router.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerConfigs));
router.use("/api/imports", importRoutes);
router.use("/api/trees", treeRoutes);
router.use("/api/auth", authRouter);

/**
 * @swagger
 * /dbcheck:
 *   get:
 *     tags: [System]
 *     summary: Verify connectivity between the API and Supabase.
 *     security: []
 *     responses:
 *       '200':
 *         description: Database query succeeded.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DbCheckResponse'
 *       '500':
 *         description: Unable to reach the database.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/api/dbcheck", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("import_jobs").select("id").limit(1);

    if (error) throw error;

    res.json({ status: "ok", db: "connected", service: "urban-tree-server" });
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

export { app };
