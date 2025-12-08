import { Router } from "express";

import {
  getTreesHandler,
  getTreeByIdHandler,
  getTreeReadingsHandler,
  getTreeLatestReadingHandler,
} from "../controllers/trees.controller";

const router = Router();

router.get("/", getTreesHandler);

router.get("/:id", getTreeByIdHandler);

router.get("/:id/readings", getTreeReadingsHandler);

router.get("/:id/readings/latest", getTreeLatestReadingHandler);

export default router;
