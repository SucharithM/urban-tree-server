// src/routes/import.routes.ts
import { Router } from "express";
import multer from "multer";

import {
  uploadImportHandler,
  listImportsHandler,
  getImportByIdHandler,
} from "../controllers/import.controller";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

// Use in-memory storage since we immediately parse the file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB – adjust if needed
  },
});

// POST /api/imports/upload
router.post("/upload", authenticate, requireAdmin, upload.single("file"), uploadImportHandler);

// GET /api/imports
router.get("/", listImportsHandler);

// GET /api/imports/:id
router.get("/:id", getImportByIdHandler);

export default router;
