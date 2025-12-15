// src/controllers/trees.controller.ts

import { Request, Response } from "express";

import { getProcessedReadingsForTree } from "../services/readings/processedReading.service";
import {
  getReadingsForTree,
  getLatestReadingForTreeRaw,
} from "../services/readings/rawReading.service";
import { getTreeReadingSummary } from "../services/readings/summaryReading.service";
import { listTrees, getTreeById } from "../services/trees/tree.service";

/**
 * @swagger
 * /trees:
 *   get:
 *     tags: [Trees]
 *     summary: List tree nodes with optional filters.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive partial match across name, location, nodeId, or species.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *         description: Maximum number of rows to return (default 100).
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Zero-based offset for pagination (default 0).
 *       - in: query
 *         name: withLatest
 *         schema:
 *           type: boolean
 *         description: If true, include the latest raw reading for each tree.
 *     responses:
 *       '200':
 *         description: A paginated list of trees.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TreeListResponse'
 *       '500':
 *         description: Failed to fetch trees.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function getTreesHandler(req: Request, res: Response) {
  try {
    const { active, search, limit, offset, withLatest } = req.query as {
      active?: string;
      search?: string;
      limit?: string;
      offset?: string;
      withLatest?: string;
    };

    const activeBool = typeof active === "string" ? active.toLowerCase() === "true" : undefined;

    const options = {
      active: activeBool,
      search: search ?? undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      withLatest: withLatest?.toLowerCase() === "true",
    };

    const result = await listTrees(options);
    res.json(result);
  } catch (err: any) {
    console.error("[getTreesHandler] Error:", err);
    res.status(500).json({ error: "Failed to fetch trees" });
  }
}

/**
 * @swagger
 * /trees/{id}:
 *   get:
 *     tags: [Trees]
 *     summary: Fetch a single tree by its ID.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tree identifier.
 *     responses:
 *       '200':
 *         description: Tree details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TreeDetail'
 *       '400':
 *         description: Missing tree ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Tree not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Failed to fetch tree.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function getTreeByIdHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing route parameter: id" });
    }
    const tree = await getTreeById(id);

    if (!tree) {
      return res.status(404).json({ error: "Tree not found" });
    }

    res.json(tree);
  } catch (err: any) {
    console.error("[getTreeByIdHandler] Error:", err);
    res.status(500).json({ error: "Failed to fetch tree" });
  }
}

/**
 * @swagger
 * /trees/{id}/readings:
 *   get:
 *     tags: [Trees]
 *     summary: List raw sensor readings for a tree.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO timestamp inclusive lower bound.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO timestamp exclusive upper bound.
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [rawData, archive, all]
 *         description: Filter by ingestion source (default all).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *         description: Maximum number of rows (default 10k).
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction (default asc).
 *     responses:
 *       '200':
 *         description: Collection of raw readings.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TreeReadingsResponse'
 *       '400':
 *         description: Missing tree ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Failed to fetch readings.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function getTreeReadingsHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing route parameter: id" });
    }

    const { from, to, source, limit, order } = req.query as {
      from?: string;
      to?: string;
      source?: string;
      limit?: string;
      order?: string;
    };

    const result = await getReadingsForTree(id, {
      from: from ?? undefined,
      to: to ?? undefined,
      source: source === "rawData" || source === "archive" ? source : "all",
      limit: limit ? Number(limit) : undefined,
      order: order === "desc" ? "desc" : "asc",
    });

    res.json(result);
  } catch (err: any) {
    console.error("[getTreeReadingsHandler] Error:", err);
    res.status(500).json({ error: "Failed to fetch readings" });
  }
}

/**
 * @swagger
 * /trees/{id}/readings/latest:
 *   get:
 *     tags: [Trees]
 *     summary: Retrieve the most recent raw reading for a tree.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Latest reading.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReadingPoint'
 *       '400':
 *         description: Missing tree ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: No readings found for tree.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Failed to fetch latest reading.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function getTreeLatestReadingHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing route parameter: id" });
    }

    const latest = await getLatestReadingForTreeRaw(id);

    if (!latest) {
      return res.status(404).json({ error: "No readings found for tree" });
    }

    res.json(latest);
  } catch (err: any) {
    console.error("[getTreeLatestReadingHandler] Error:", err);
    res.status(500).json({ error: "Failed to fetch latest reading" });
  }
}

/**
 * @swagger
 * /trees/{id}/readings/processed:
 *   get:
 *     tags: [Trees]
 *     summary: Retrieve merged raw + computed readings for a tree.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 2000
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [rawData, archive, all]
 *     responses:
 *       '200':
 *         description: Processed readings bundled with metadata.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TreeProcessedReadingsResponse'
 *       '400':
 *         description: Missing tree ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Tree not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Failed to fetch processed readings.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function getTreeProcessedReadingsHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing route parameter: id" });
    }

    const { from, to, limit, order, source } = req.query as {
      from?: string;
      to?: string;
      limit?: string;
      order?: string;
      source?: string;
    };

    const result = await getProcessedReadingsForTree(id, {
      from: from ?? undefined,
      to: to ?? undefined,
      limit: limit ? Number(limit) : undefined,
      order: order === "desc" ? "desc" : "asc",
      source: source === "rawData" || source === "archive" ? source : "all",
    });

    res.json(result);
  } catch (err: any) {
    if (err?.message === "TREE_NOT_FOUND") {
      return res.status(404).json({ error: "Tree not found" });
    }
    console.error("[getTreeSheetReadingsHandler] Error:", err);
    res.status(500).json({ error: "Failed to fetch sheet-style readings" });
  }
}

/**
 * @swagger
 * /trees/{id}/readings/summary:
 *   get:
 *     tags: [Trees]
 *     summary: Aggregate readings into hourly/daily buckets.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [rawData, archive, all]
 *       - in: query
 *         name: bucketSize
 *         schema:
 *           type: string
 *           enum: [all, day, hour]
 *         description: Aggregation window (default day).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of rows processed before aggregation (default 50000).
 *     responses:
 *       '200':
 *         description: Summary buckets.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TreeReadingSummaryResponse'
 *       '400':
 *         description: Missing tree ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Tree not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Failed to fetch summary readings.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function getTreeSummaryReadingsHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing route parameter: id" });
    }

    const { from, to, source, bucketSize, limit } = req.query as {
      from?: string;
      to?: string;
      source?: string;
      bucketSize?: string;
      limit?: string;
    };

    const sizeParam = bucketSize === "hour" || bucketSize === "all" ? bucketSize : "day";

    const result = await getTreeReadingSummary(id, {
      from: from ?? undefined,
      to: to ?? undefined,
      source: source === "rawData" || source === "archive" ? source : "all",
      bucketSize: sizeParam,
      limit: limit ? Number(limit) : undefined,
    });

    res.json(result);
  } catch (err: any) {
    if (err?.message === "TREE_NOT_FOUND") {
      return res.status(404).json({ error: "Tree not found" });
    }
    console.error("[getTreeSummaryReadingsHandler] Error:", err);
    res.status(500).json({ error: "Failed to fetch summary readings" });
  }
}
