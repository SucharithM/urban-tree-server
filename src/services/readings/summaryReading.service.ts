import { supabase } from "../../config/supabase.client";
import { GetTreeReadingSummaryResponse, TreeReadingSummaryBucket } from "../../types/api";

export type GetReadingSummaryOptions = {
  from?: string;
  to?: string;
  source?: "rawData" | "archive" | "all";
  bucketSize?: "all" | "day" | "hour";
  limit?: number;
};

type MetricAgg = {
  sum: number;
  min: number;
  max: number;
  count: number;
};

type BucketAgg = {
  start: Date;
  end: Date;
  count: number;
  temp?: MetricAgg;
  pressure?: MetricAgg;
  humidity?: MetricAgg;
  dendroRaw?: MetricAgg;
  dendroMm?: MetricAgg;
  sapflow?: MetricAgg;
};

function addValue(
  agg: MetricAgg | undefined,
  value: number | null | undefined,
): MetricAgg | undefined {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return agg;
  }
  if (!agg) {
    return {
      sum: value,
      min: value,
      max: value,
      count: 1,
    };
  }
  return {
    sum: agg.sum + value,
    min: Math.min(agg.min, value),
    max: Math.max(agg.max, value),
    count: agg.count + 1,
  };
}

function finalizeMetric(agg?: MetricAgg): {
  avg: number | null;
  min: number | null;
  max: number | null;
} {
  if (!agg || agg.count === 0) {
    return { avg: null, min: null, max: null };
  }
  return {
    avg: agg.sum / agg.count,
    min: agg.min,
    max: agg.max,
  };
}

function truncateToBucketStart(date: Date, bucketSize: "all" | "day" | "hour"): Date {
  if (bucketSize === "all") {
    return new Date(0); // epoch; we'll override later
  }

  const dateObject = new Date(date);

  if (bucketSize === "day") {
    dateObject.setUTCHours(0, 0, 0, 0);
  } else if (bucketSize === "hour") {
    dateObject.setUTCMinutes(0, 0, 0);
    dateObject.setUTCMilliseconds(0);
  }

  return dateObject;
}

function computeBucketEnd(start: Date, bucketSize: "all" | "day" | "hour"): Date {
  if (bucketSize === "all") {
    return new Date(start);
  }
  const d = new Date(start);
  if (bucketSize === "day") {
    d.setUTCDate(d.getUTCDate() + 1);
  } else if (bucketSize === "hour") {
    d.setUTCHours(d.getUTCHours() + 1);
  }
  return d;
}

export async function getTreeReadingSummary(
  treeId: string,
  options: GetReadingSummaryOptions = {},
): Promise<GetTreeReadingSummaryResponse> {
  const { from, to, source = "all", bucketSize = "day", limit } = options;

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

  const maxRows = limit ?? 50000;

  let rawQuery = supabase
    .from("raw_readings")
    .select(
      `
      timestamp,
      temperature,
      pressure,
      humidity,
      dendrometer,
      dataSource
    `,
    )
    .eq("treeNodeId", treeId)
    .order("timestamp", { ascending: true })
    .limit(maxRows);

  if (from) rawQuery = rawQuery.gte("timestamp", from);
  if (to) rawQuery = rawQuery.lt("timestamp", to);
  if (source !== "all") rawQuery = rawQuery.eq("dataSource", source);

  const { data: rawData, error: rawError } = await rawQuery;

  if (rawError) {
    throw new Error(`Failed to fetch raw readings: ${rawError.message}`);
  }

  const rawRows = rawData ?? [];

  if (rawRows.length === 0) {
    return {
      treeId: tree.id,
      nodeId: tree.nodeId,
      name: tree.name,
      bucketSize,
      buckets: [],
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
      sapflowCmPerHr
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

  const bucketMap = new Map<string, BucketAgg>();
  let globalFirstTs: Date | null = null;
  let globalLastTs: Date | null = null;

  for (const row of rawRows as any[]) {
    const ts = new Date(row.timestamp);
    if (isNaN(ts.getTime())) {
      continue;
    }

    if (!globalFirstTs || ts < globalFirstTs) globalFirstTs = ts;
    if (!globalLastTs || ts > globalLastTs) globalLastTs = ts;

    const bucketStartDate =
      bucketSize === "all" ? new Date(0) : truncateToBucketStart(ts, bucketSize);

    const key = bucketSize === "all" ? "all" : bucketStartDate.toISOString();

    let bucket = bucketMap.get(key);
    if (!bucket) {
      const end =
        bucketSize === "all"
          ? new Date(0) // temporary; will adjust later
          : computeBucketEnd(bucketStartDate, bucketSize);

      bucket = {
        start: bucketStartDate,
        end,
        count: 0,
      };
      bucketMap.set(key, bucket);
    }

    bucket.count += 1;

    bucket.temp = addValue(bucket.temp, row.temperature);
    bucket.pressure = addValue(bucket.pressure, row.pressure);
    bucket.humidity = addValue(bucket.humidity, row.humidity);
    bucket.dendroRaw = addValue(bucket.dendroRaw, row.dendrometer);

    const comp = computedMap.get(row.timestamp);
    if (comp) {
      bucket.dendroMm = addValue(bucket.dendroMm, comp.dendroCalibratedMm);
      bucket.sapflow = addValue(bucket.sapflow, comp.sapflowCmPerHr);
    }
  }

  if (bucketSize === "all" && bucketMap.has("all")) {
    const b = bucketMap.get("all")!;
    if (globalFirstTs) b.start = globalFirstTs;
    if (globalLastTs) {
      const end = new Date(globalLastTs);
      end.setSeconds(end.getSeconds() + 1);
      b.end = end;
    }
  }

  const buckets: TreeReadingSummaryBucket[] = Array.from(bucketMap.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((b) => {
      const temp = finalizeMetric(b.temp);
      const pres = finalizeMetric(b.pressure);
      const hum = finalizeMetric(b.humidity);
      const dendroRaw = finalizeMetric(b.dendroRaw);
      const dendroMm = finalizeMetric(b.dendroMm);
      const sap = finalizeMetric(b.sapflow);

      return {
        bucketStart: b.start.toISOString(),
        bucketEnd: b.end.toISOString(),
        bucketSize,
        count: b.count,

        avgTemperature: temp.avg,
        minTemperature: temp.min,
        maxTemperature: temp.max,

        avgPressure: pres.avg,
        minPressure: pres.min,
        maxPressure: pres.max,

        avgHumidity: hum.avg,
        minHumidity: hum.min,
        maxHumidity: hum.max,

        avgDendroRaw: dendroRaw.avg,
        minDendroRaw: dendroRaw.min,
        maxDendroRaw: dendroRaw.max,

        avgDendroMm: dendroMm.avg,
        minDendroMm: dendroMm.min,
        maxDendroMm: dendroMm.max,

        avgSapflowCmPerHr: sap.avg,
        minSapflowCmPerHr: sap.min,
        maxSapflowCmPerHr: sap.max,
      };
    });

  return {
    treeId: tree.id,
    nodeId: tree.nodeId,
    name: tree.name,
    bucketSize,
    buckets,
  };
}
