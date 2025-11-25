import express, { Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

import { prisma } from "./config/db.client";
import { swaggerConfigs } from "./config/swagger";

const app = express();

app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "urban-tree-server" });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerConfigs));

// JSON endpoint for the spec (optional, for Redoc or clients)
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerConfigs);
});

app.get("/dbcheck", async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected", service: "urban-tree-server" });
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

export { app };
