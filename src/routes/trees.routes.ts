import { Router } from "express";

import {
  getTreesHandler,
  getTreeByIdHandler,
  getTreeReadingsHandler,
  getTreeLatestReadingHandler,
  getTreeProcessedReadingsHandler,
  getTreeSummaryReadingsHandler,
} from "../controllers/trees.controller";

const router = Router();

router.get("/", getTreesHandler);

router.get("/:id", getTreeByIdHandler);

router.get("/:id/readings", getTreeReadingsHandler);

router.get("/:id/readings/latest", getTreeLatestReadingHandler);

router.get("/:id/readings/processed", getTreeProcessedReadingsHandler);

router.get("/:id/readings/summary", getTreeSummaryReadingsHandler);

export default router;
