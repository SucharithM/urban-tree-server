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
