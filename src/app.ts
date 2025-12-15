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

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "urban-tree-server" });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerConfigs));
app.use("/api/imports", importRoutes);
app.use("/api/trees", treeRoutes);
app.use("/api/auth", authRouter);

app.get("/dbcheck", async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.from("import_jobs").select("id").limit(1);

    if (error) {
      throw error;
    }

    res.json({ status: "ok", db: "connected", service: "urban-tree-server" });
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

export { app };
