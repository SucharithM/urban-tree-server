// src/controllers/import.controller.ts
import { Request, Response } from "express";

import { processImportFromBuffer } from "../services/import/importer.service";
import { getImportJobById, listImportJobs } from "../services/import/importJob.service";

export const uploadImportHandler = async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: "No file provided. Please upload a file in the `file` field.",
      });
    }

    const job = await processImportFromBuffer({
      fileName: file.originalname,
      fileSize: file.size,
      buffer: file.buffer,
    });

    return res.status(201).json(job);
  } catch (error) {
    console.error("[uploadImportHandler] Error importing file:", error);
    return res.status(500).json({
      error: "Failed to import file.",
    });
  }
};

export const listImportsHandler = async (req: Request, res: Response) => {
  try {
    const jobs = await listImportJobs();
    return res.json(jobs);
  } catch (error) {
    console.error("[listImportsHandler] Error fetching import jobs:", error);
    return res.status(500).json({
      error: "Failed to fetch import jobs.",
    });
  }
};

export const getImportByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing route parameter: id" });
    }

    const job = await getImportJobById(id);

    if (!job) {
      return res.status(404).json({
        error: "Import job not found.",
      });
    }

    return res.json(job);
  } catch (error) {
    console.error("[getImportByIdHandler] Error fetching import job:", error);
    return res.status(500).json({
      error: "Failed to fetch import job.",
    });
  }
};
