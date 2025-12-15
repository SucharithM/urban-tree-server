export type TreeSummary = {
  id: string;
  nodeId: string;
  name: string | null;
  location: string | null;
  lat: number | null;
  lon: number | null;
  species: string | null;
  dbh: number | null;
  active: boolean;
  latestReading?: LatestReadingSummary | null;
};

export type LatestReadingSummary = {
  timestamp: string;
  temperature?: number | null;
  humidity?: number | null;
  dendrometer?: number | null;
  sapflow1?: number | null;
  dataSource?: string | null;
};

export type TreeDetail = {
  id: string;
  nodeId: string;
  boardId: string | null;
  name: string | null;
  location: string | null;
  sensorDepths: string | null;
  sitePi: string | null;
  lat: number | null;
  lon: number | null;
  species: string | null;
  dbh: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  latestReading?: LatestReadingSummary | null;
};

export type ReadingPoint = {
  timestamp: string;
  temperature?: number | null;
  pressure?: number | null;
  humidity?: number | null;
  dendrometer?: number | null;
  sapflow1?: number | null;
  sapflow2?: number | null;
  sapflow3?: number | null;
  sapflow4?: number | null;
  battery?: number | null;
  lipoCharge?: number | null;
  dataSource: string | null;
};

export type GetTreesResponse = {
  items: TreeSummary[];
  total: number;
};

export type GetTreeReadingsResponse = {
  treeId: string;
  count: number;
  items: ReadingPoint[];
};

export type ProcessedReadingPoint = {
  timestamp: string;
  temperature?: number | null;
  pressure?: number | null;
  humidity?: number | null;
  dendroRaw?: number | null;
  sapflowCmPerHr?: number | null;
  sfMaxD?: number | null;
  sfSignal?: number | null;
  sfNoise?: number | null;
  dendroMm?: number | null;
};

export type GetTreeProcessedReadingsResponse = {
  treeId: string;
  nodeId: string;
  name: string | null;
  readings: ProcessedReadingPoint[];
  total: number;
};

export type TreeReadingSummaryBucket = {
  bucketStart: string;
  bucketEnd: string;
  bucketSize: "all" | "day" | "hour";
  count: number;

  avgTemperature?: number | null;
  minTemperature?: number | null;
  maxTemperature?: number | null;

  avgPressure?: number | null;
  minPressure?: number | null;
  maxPressure?: number | null;

  avgHumidity?: number | null;
  minHumidity?: number | null;
  maxHumidity?: number | null;

  avgDendroRaw?: number | null;
  minDendroRaw?: number | null;
  maxDendroRaw?: number | null;

  avgDendroMm?: number | null;
  minDendroMm?: number | null;
  maxDendroMm?: number | null;

  avgSapflowCmPerHr?: number | null;
  minSapflowCmPerHr?: number | null;
  maxSapflowCmPerHr?: number | null;
};

export type GetTreeReadingSummaryResponse = {
  treeId: string;
  nodeId: string;
  name: string | null;
  bucketSize: "all" | "day" | "hour";
  buckets: TreeReadingSummaryBucket[];
};
