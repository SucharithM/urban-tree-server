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
  const { from, to, limit = 2000, order = "asc" } = options;

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
  let compQuery = supabase
    .from("computed_readings")
    .select(
      `
      timestamp,
      temperature,
      pressure,
      humidity,
      dendroRaw,
      dendroCalibratedMm,
      sapflowCmPerHr,
      sfMaxD,
      sfSignal,
      sfNoise
    `,
      { count: "exact" },
    )
    .eq("treeNodeId", treeId)
    .order("timestamp", { ascending: order === "asc" })
    .limit(limit);

  if (from) compQuery = compQuery.gte("timestamp", from);
  if (to) compQuery = compQuery.lt("timestamp", to);

  const { data: compData, error: compError, count: compCount } = await compQuery;

  if (compError) {
    console.error("[getProcessedReadingsForTree] computed_readings error:", compError);
  }

  const computedRows = compData ?? [];

  if (computedRows.length > 0) {
    const readings: ProcessedReadingPoint[] = computedRows.map((row: any) => ({
      timestamp: row.timestamp,
      temperature: row.temperature,
      pressure: row.pressure,
      humidity: row.humidity,
      dendroRaw: row.dendroRaw,
      dendroMm: row.dendroCalibratedMm,
      sapflowCmPerHr: row.sapflowCmPerHr,
      sfMaxD: row.sfMaxD,
      sfSignal: row.sfSignal,
      sfNoise: row.sfNoise,
    }));

    return {
      treeId: tree.id,
      nodeId: tree.nodeId,
      name: tree.name,
      source: "computed",
      readings,
      total: compCount ?? readings.length,
    };
  }

  let rawQuery = supabase
    .from("raw_readings")
    .select(
      `
      timestamp,
      temperature,
      pressure,
      humidity,
      dendrometer
    `,
      { count: "exact" },
    )
    .eq("treeNodeId", treeId)
    .order("timestamp", { ascending: order === "asc" })
    .limit(limit);

  if (from) rawQuery = rawQuery.gte("timestamp", from);
  if (to) rawQuery = rawQuery.lt("timestamp", to);

  const { data: rawData, error: rawError, count: rawCount } = await rawQuery;

  if (rawError) {
    throw new Error(`Failed to fetch raw readings for fallback: ${rawError.message}`);
  }

  const rawRows = rawData ?? [];

  const readings: ProcessedReadingPoint[] = rawRows.map((row: any) => ({
    timestamp: row.timestamp,
    temperature: row.temperature,
    pressure: row.pressure,
    humidity: row.humidity,
    dendroRaw: row.dendrometer,
    dendroMm: null,
    sapflowCmPerHr: null,
    sfMaxD: null,
    sfSignal: null,
    sfNoise: null,
  }));

  return {
    treeId: tree.id,
    nodeId: tree.nodeId,
    name: tree.name,
    source: "raw-fallback",
    readings,
    total: rawCount ?? readings.length,
  };
}
