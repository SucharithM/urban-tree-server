import { supabase } from "../../config/supabase.client";
import { GetTreeProcessedReadingsResponse, ProcessedReadingPoint } from "../../types/api";

export type GetProcessedReadingsOptions = {
  from?: string;
  to?: string;
  limit?: number;
  order?: "asc" | "desc";
  source?: "rawData" | "archive" | "all";
};

export async function getProcessedReadingsForTree(
  treeId: string,
  options: GetProcessedReadingsOptions = {},
): Promise<GetTreeProcessedReadingsResponse> {
  const { from, to, limit = 2000, order = "asc", source = "all" } = options;

  // Tree metadata
  const { data: tree, error: treeError } = await supabase
    .from("tree_nodes")
    .select("id, nodeId, name")
    .eq("id", treeId)
    .single();

  if (treeError) {
    throw new Error(`Tree lookup failed: ${treeError.message}`);
  }
  if (!tree) {
    throw new Error("TREE_NOT_FOUND");
  }

  // Raw readings
  let rawQuery = supabase
    .from("raw_readings")
    .select(
      `
      timestamp,
      temperature,
      pressure,
      humidity,
      dendrometer,
      sapflow1,
      dataSource
    `,
      { count: "exact" },
    )
    .eq("treeNodeId", treeId)
    .order("timestamp", { ascending: order === "asc" })
    .limit(limit);

  if (from) rawQuery = rawQuery.gte("timestamp", from);
  if (to) rawQuery = rawQuery.lt("timestamp", to);
  if (source !== "all") rawQuery = rawQuery.eq("dataSource", source);

  const { data: rawData, error: rawError, count } = await rawQuery;

  if (rawError) {
    throw new Error(`Failed to fetch raw readings: ${rawError.message}`);
  }

  const rawRows = rawData ?? [];
  if (rawRows.length === 0) {
    return {
      treeId: tree.id,
      nodeId: tree.nodeId,
      name: tree.name,
      readings: [],
      total: 0,
    };
  }

  const timestamps = rawRows.map((r: any) => r.timestamp);
  const computedMap = new Map<string, any>();

  const { data: compData, error: compError } = await supabase
    .from("computed_readings")
    .select(
      `
      timestamp,
      dendroCalibratedMm,
      sapflowCmPerHr,
      sfMaxD,
      sfSignal,
      sfNoise
    `,
    )
    .eq("treeNodeId", treeId)
    .in("timestamp", timestamps);

  if (compError) {
    throw new Error(`Failed to fetch computed readings: ${compError.message}`);
  }

  (compData ?? []).forEach((row: any) => {
    computedMap.set(row.timestamp, row);
  });

  // Merge: raw (canonical) + computed
  const readings: ProcessedReadingPoint[] = rawRows.map((row: any) => {
    const comp = computedMap.get(row.timestamp);

    return {
      timestamp: row.timestamp,
      temperature: row.temperature,
      pressure: row.pressure,
      humidity: row.humidity,
      dendroRaw: row.dendrometer,
      sapflowCmPerHr:
        comp?.sapflowCmPerHr ?? (typeof row.sapflow1 === "number" ? row.sapflow1 : null),
      sfMaxD: comp?.sfMaxD ?? null,
      sfSignal: comp?.sfSignal ?? null,
      sfNoise: comp?.sfNoise ?? null,
      dendroMm: comp?.dendroCalibratedMm ?? null,
    };
  });

  return {
    treeId: tree.id,
    nodeId: tree.nodeId,
    name: tree.name,
    readings,
    total: count ?? readings.length,
  };
}
