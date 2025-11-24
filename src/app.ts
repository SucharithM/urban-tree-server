import express, { Request, Response } from "express";

import { prisma } from "./config/prisma.config";

const app = express();

app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "urban-tree-server" });
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
