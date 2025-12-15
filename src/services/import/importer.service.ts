import { supabase } from "../../config/supabase.client";

import {
  parseWorkbook,
  ParsedNodeInfoRow,
  ParsedReadingRow,
  ParsedComputedReadingRow,
} from "./../excel.service";
import { createImportJob, updateImportJob, ImportJobRow } from "./importJob.service";

interface ImportFromBufferParams {
  fileName: string;
  fileSize: number;
  buffer: Buffer;
}

const TREE_TABLE = "tree_nodes";
const RAW_TABLE = "raw_readings";
const nowIso = new Date().toISOString();

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
async function upsertComputedReadings(
  computed: ParsedComputedReadingRow[],
  nodeIdToTreeId: Map<string, string>,
): Promise<{ imported: number; skipped: number }> {
  if (!computed.length) {
    return { imported: 0, skipped: 0 };
  }

  const nowIso = new Date().toISOString();

  // Map (treeNodeId, timestamp) -> row to dedupe
  const byKey = new Map<string, any>();

  for (const row of computed) {
    const treeNodeId = nodeIdToTreeId.get(row.nodeId);
    if (!treeNodeId) {
      // Node doesn't exist in tree_nodes (maybe filtered out), skip
      continue;
    }

    const key = `${treeNodeId}__${row.timestamp}`;
    if (byKey.has(key)) continue;

    byKey.set(key, {
      treeNodeId,
      timestamp: row.timestamp,
      dendroCalibratedMm: row.dendroCalibratedMm,
      sapflowCmPerHr: row.sapflowCmPerHr,
      sfMaxD: row.sfMaxD,
      sfSignal: row.sfSignal,
      sfNoise: row.sfNoise,
      dataSource: row.dataSource,
      importedAt: nowIso,
    });
  }

  const rows = Array.from(byKey.values());
  const chunkSize = 500;
  let imported = 0;
  const skipped = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const { error, status, count } = await supabase.from("computed_readings").upsert(chunk, {
      onConflict: "treeNodeId,timestamp",
      ignoreDuplicates: false,
      count: "exact",
    });

    if (error) {
      console.error("[upsertComputedReadings] Supabase error:", error);
      throw error;
    }

    imported += count ?? chunk.length;
  }

  return { imported, skipped };
}

async function upsertTreeNodes(
  nodeInfo: ParsedNodeInfoRow[],
  readings: ParsedReadingRow[],
): Promise<Map<string, string>> {
  const nodeInfoByNode = new Map<string, ParsedNodeInfoRow>();
  for (const row of nodeInfo) {
    nodeInfoByNode.set(row.node, row);
  }

  const nodeIdsFromReadings = new Set<string>();
  for (const r of readings) {
    nodeIdsFromReadings.add(r.node);
  }

  const allNodeIds = new Set<string>([...nodeInfoByNode.keys(), ...nodeIdsFromReadings]);

  if (allNodeIds.size === 0) {
    return new Map();
  }

  const payload: any[] = [];
  for (const node of allNodeIds) {
    const info = nodeInfoByNode.get(node);

    payload.push({
      nodeId: node,
      boardId: info?.boardId ?? null,
      name: info?.name ?? null,
      location: info?.location ?? null,
      sensorDepths: info?.sensorDepths ?? null,
      sitePi: info?.sitePi ?? null,
      lat: info?.lat ?? null,
      lon: info?.lon ?? null,
      species: info?.species ?? null,
      dbh: info?.dbh ?? null,
      active: true,
      updatedAt: nowIso,
    });
  }

  const { data, error } = await supabase
    .from(TREE_TABLE)
    .upsert(payload, { onConflict: "nodeId" })
    .select("id, nodeId");

  if (error) {
    console.error("[upsertTreeNodes] Supabase error:", error);
    throw new Error("Failed to upsert tree nodes");
  }

  const idByNodeId = new Map<string, string>();
  for (const row of data ?? []) {
    idByNodeId.set(row.nodeId as string, row.id as string);
  }

  return idByNodeId;
}

async function upsertRawReadings(
  readings: ParsedReadingRow[],
  idByNodeId: Map<string, string>,
): Promise<{
  imported: number;
  skipped: number;
}> {
  if (readings.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  const rowsByKey = new Map<string, any>();
  let skipped = 0;

  for (const r of readings) {
    const treeNodeId = idByNodeId.get(r.node);
    if (!treeNodeId) {
      skipped += 1;
      continue;
    }

    const tsIso = r.timestamp.toISOString();
    const key = `${treeNodeId}__${tsIso}`;

    if (rowsByKey.has(key)) {
      skipped += 1;
      continue;
    }

    rowsByKey.set(key, {
      treeNodeId,
      timestamp: tsIso,
      temperature: r.temperature ?? null,
      pressure: r.pressure ?? null,
      humidity: r.humidity ?? null,
      dendrometer: r.dendrometer ?? null,
      sapflow1: r.sapflow1 ?? null,
      sapflow2: r.sapflow2 ?? null,
      sapflow3: r.sapflow3 ?? null,
      sapflow4: r.sapflow4 ?? null,
      battery: r.battery ?? null,
      lipoCharge: r.lipoCharge ?? null,
      notes: r.notes ?? null,
      dataSource: r.source,
    });
  }

  const rowsToInsert = Array.from(rowsByKey.values());

  if (rowsToInsert.length === 0) {
    return { imported: 0, skipped };
  }

  const chunks = chunkArray(rowsToInsert, 500);
  for (const chunk of chunks) {
    const { error } = await supabase
      .from(RAW_TABLE)
      .upsert(chunk, { onConflict: "treeNodeId,timestamp" });

    if (error) {
      console.error("[upsertRawReadings] Supabase error:", error);
      throw new Error("Failed to upsert raw readings");
    }
  }

  return {
    imported: rowsToInsert.length,
    skipped,
  };
}

export async function processImportFromBuffer(
  params: ImportFromBufferParams,
): Promise<ImportJobRow> {
  const { fileName, fileSize, buffer } = params;

  const job = await createImportJob({
    fileName,
    fileSize,
    status: "PROCESSING",
    sheetsProcessed: [],
    recordsImported: 0,
    recordsSkipped: 0,
    recordsFailed: 0,
    warnings: [],
    errors: [],
  });

  try {
    const { nodeInfo, readings, computedReadings, sheetsProcessed } = parseWorkbook(buffer);

    const idByNodeId = await upsertTreeNodes(nodeInfo, readings);

    const { imported: rawImported, skipped: rawSkipped } = await upsertRawReadings(
      readings,
      idByNodeId,
    );

    const { imported: computedImported, skipped: computedSkipped } = await upsertComputedReadings(
      computedReadings,
      idByNodeId,
    );

    const completedAt = new Date().toISOString();

    const updatedJob = await updateImportJob(job.id, {
      status: "COMPLETED",
      sheetsProcessed,
      recordsImported: rawImported + computedImported,
      recordsSkipped: rawSkipped + computedSkipped,
      recordsFailed: 0,
      completedAt,
    });

    return updatedJob;
  } catch (err) {
    console.error("[processImportFromBuffer] Import failed:", err);

    const completedAt = new Date().toISOString();

    await updateImportJob(job.id, {
      status: "FAILED",
      recordsFailed: 1,
      completedAt,
      errors: [
        {
          message: err instanceof Error ? err.message : "Unknown import error",
        },
      ],
    });

    throw err;
  }
}
