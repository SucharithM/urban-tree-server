import { supabase } from "../../config/supabase.client";
import { GetTreesResponse, LatestReadingSummary, TreeDetail, TreeSummary } from "../../types/api";

export type ListTreesOptions = {
  active?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  withLatest?: boolean;
};

export async function listTrees(options: ListTreesOptions = {}): Promise<GetTreesResponse> {
  const { active = true, search, limit = 100, offset = 0, withLatest = false } = options;

  let query = supabase
    .from("tree_nodes")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (typeof active === "boolean") {
    query = query.eq("active", active);
  }

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    query = query.or(
      [
        `name.ilike.${term}`,
        `location.ilike.${term}`,
        `nodeId.ilike.${term}`,
        `species.ilike.${term}`,
      ].join(","),
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list trees: ${error.message}`);
  }

  const items: TreeSummary[] =
    (data ?? []).map((row: any) => ({
      id: row.id,
      nodeId: row.nodeId,
      name: row.name,
      location: row.location,
      lat: row.lat,
      lon: row.lon,
      species: row.species,
      dbh: row.dbh,
      active: row.active,
    })) ?? [];

  if (withLatest && items.length > 0) {
    const withLatestItems: TreeSummary[] = [];

    for (const tree of items) {
      const latestReading = await getLatestReadingForTree(tree.id);
      withLatestItems.push({
        ...tree,
        latestReading: latestReading ?? undefined,
      });
    }

    return {
      items: withLatestItems,
      total: count ?? withLatestItems.length,
    };
  }

  return {
    items,
    total: count ?? items.length,
  };
}

export async function getTreeById(id: string): Promise<TreeDetail | null> {
  const { data, error } = await supabase.from("tree_nodes").select("*").eq("id", id).single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch tree: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const latestReading = await getLatestReadingForTree(data.id);

  const detail: TreeDetail = {
    id: data.id,
    nodeId: data.nodeId,
    boardId: data.boardId,
    name: data.name,
    location: data.location,
    sensorDepths: data.sensorDepths,
    sitePi: data.sitePi,
    lat: data.lat,
    lon: data.lon,
    species: data.species,
    dbh: data.dbh,
    active: data.active,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    latestReading: latestReading ?? undefined,
  };

  return detail;
}

/**
 * Latest reading summary for a tree.
 * Used by both listTrees(withLatest) and getTreeById.
 */
export async function getLatestReadingForTree(
  treeId: string,
): Promise<LatestReadingSummary | null> {
  const { data, error } = await supabase
    .from("raw_readings")
    .select(
      `
      timestamp,
      temperature,
      humidity,
      dendrometer,
      sapflow1,
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

  const latest: LatestReadingSummary = {
    timestamp: row.timestamp,
    temperature: row.temperature,
    humidity: row.humidity,
    dendrometer: row.dendrometer,
    sapflow1: row.sapflow1,
    dataSource: row.dataSource,
  };

  return latest;
}
