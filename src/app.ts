import express, { Request, Response } from "express";

const app = express();

app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "urban-tree-server" });
});

export { app };
