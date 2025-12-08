import { supabase } from "../../config/supabase.client";
import { GetTreeReadingsResponse, ReadingPoint } from "../../types/api";

export type GetReadingsOptions = {
  from?: string;
  to?: string;
  source?: "rawData" | "archive" | "all";
  limit?: number;
  order?: "asc" | "desc";
};

export async function getReadingsForTree(
  treeId: string,
  options: GetReadingsOptions = {},
): Promise<GetTreeReadingsResponse> {
  const { from, to, source = "all", limit = 10000, order = "asc" } = options;

  let query = supabase
    .from("raw_readings")
    .select(
      `
      timestamp,
      temperature,
      pressure,
      humidity,
      dendrometer,
      sapflow1,
      sapflow2,
      sapflow3,
      sapflow4,
      battery,
      lipoCharge,
      dataSource
    `,
      { count: "exact" },
    )
    .eq("treeNodeId", treeId)
    .order("timestamp", { ascending: order === "asc" })
    .limit(limit);

  if (from) {
    query = query.gte("timestamp", from);
  }

  if (to) {
    query = query.lt("timestamp", to);
  }

  if (source !== "all") {
    query = query.eq("dataSource", source);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch readings: ${error.message}`);
  }

  const items: ReadingPoint[] =
    (data ?? []).map((row: any) => ({
      timestamp: row.timestamp,
      temperature: row.temperature,
      pressure: row.pressure,
      humidity: row.humidity,
      dendrometer: row.dendrometer,
      sapflow1: row.sapflow1,
      sapflow2: row.sapflow2,
      sapflow3: row.sapflow3,
      sapflow4: row.sapflow4,
      battery: row.battery,
      lipoCharge: row.lipoCharge,
      dataSource: row.dataSource,
    })) ?? [];

  return {
    treeId,
    count: count ?? items.length,
    items,
  };
}

export async function getLatestReadingForTreeRaw(treeId: string): Promise<ReadingPoint | null> {
  const { data, error } = await supabase
    .from("raw_readings")
    .select(
      `
      timestamp,
      temperature,
      pressure,
      humidity,
      dendrometer,
      sapflow1,
      sapflow2,
      sapflow3,
      sapflow4,
      battery,
      lipoCharge,
      dataSource
    `,
    )
    .eq("treeNodeId", treeId)
    .order("timestamp", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch latest reading: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];
  if (!row) {
    return null;
  }

  const reading: ReadingPoint = {
    timestamp: row.timestamp,
    temperature: row.temperature,
    pressure: row.pressure,
    humidity: row.humidity,
    dendrometer: row.dendrometer,
    sapflow1: row.sapflow1,
    sapflow2: row.sapflow2,
    sapflow3: row.sapflow3,
    sapflow4: row.sapflow4,
    battery: row.battery,
    lipoCharge: row.lipoCharge,
    dataSource: row.dataSource,
  };

  return reading;
}
