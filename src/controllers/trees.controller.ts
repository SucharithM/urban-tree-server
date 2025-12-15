// src/controllers/trees.controller.ts

import { Request, Response } from "express";

import { getProcessedReadingsForTree } from "../services/readings/processedReading.service";
import {
  getReadingsForTree,
  getLatestReadingForTreeRaw,
} from "../services/readings/rawReading.service";
import { getTreeReadingSummary } from "../services/readings/summaryReading.service";
import { listTrees, getTreeById } from "../services/trees/tree.service";

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
