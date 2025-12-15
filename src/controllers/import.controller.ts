// src/controllers/import.controller.ts
import { Request, Response } from "express";

import { processImportFromBuffer } from "../services/import/importer.service";
import { getImportJobById, listImportJobs } from "../services/import/importJob.service";

/**
 * @swagger
 * /imports/upload:
 *   post:
 *     tags: [Imports]
 *     summary: Upload an XLSX workbook and trigger an import job.
 *     description: Requires admin privileges. File should be provided in the `file` field.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *             required:
 *               - file
 *     responses:
 *       '201':
 *         description: Import job created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportJob'
 *       '400':
 *         description: Missing file.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Authentication required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Admin access required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Failed to process the import.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /imports:
 *   get:
 *     tags: [Imports]
 *     summary: List the latest import jobs.
 *     security: []
 *     responses:
 *       '200':
 *         description: Recent jobs sorted by start time (desc).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportJobListResponse'
 *       '500':
 *         description: Failed to fetch jobs.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

/**
 * @swagger
 * /imports/{id}:
 *   get:
 *     tags: [Imports]
 *     summary: Fetch a specific import job by ID.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Import job details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImportJob'
 *       '400':
 *         description: Missing job ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Job not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Failed to fetch job.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
