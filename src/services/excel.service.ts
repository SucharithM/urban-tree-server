import * as XLSX from "xlsx";

export type ReadingSource = "rawData" | "archive";

export interface ParsedNodeInfoRow {
  node: string;
  boardId?: string;
  name?: string;
  location?: string;
  sensorDepths?: string;
  sitePi?: string;
  lat?: number;
  lon?: number;
  species?: string;
  dbh?: number;
}

export interface ParsedReadingRow {
  node: string;
  timestamp: Date;
  temperature?: number;
  pressure?: number;
  humidity?: number;
  dendrometer?: number;
  sapflow1?: number;
  sapflow2?: number;
  sapflow3?: number;
  sapflow4?: number;
  battery?: number;
  lipoCharge?: number;
  notes?: string;
  source: ReadingSource;
}

export interface ParsedWorkbookResult {
  nodeInfo: ParsedNodeInfoRow[];
  readings: ParsedReadingRow[];
  sheetsProcessed: string[];
}

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
};

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
};

export function parseWorkbook(buffer: Buffer): ParsedWorkbookResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheetsProcessed: string[] = [];
  const nodeInfo: ParsedNodeInfoRow[] = [];
  const readings: ParsedReadingRow[] = [];

  const nodeInfoSheet = workbook.Sheets["nodeInfo"];
  if (nodeInfoSheet) {
    sheetsProcessed.push("nodeInfo");

    const rows = XLSX.utils.sheet_to_json<any>(nodeInfoSheet, { defval: null });

    for (const row of rows) {
      const node = toStringOrUndefined(row["Node"]);
      if (!node) continue;

      nodeInfo.push({
        node,
        boardId: toStringOrUndefined(row["Board_ID"]),
        name: toStringOrUndefined(row["Name"]),
        location: toStringOrUndefined(row["Location"]),
        sensorDepths: toStringOrUndefined(row["Sensor Depths"]),
        sitePi: toStringOrUndefined(row["Site PI"]),
        lat: toNumber(row["Lat"]),
        lon: toNumber(row["Lon"]),
        species: toStringOrUndefined(row["Species"]),
        dbh: toNumber(row["DBH"]),
      });
    }
  }

  // --- helper to parse reading sheets (rawData + archive) ---
  const parseReadingSheet = (sheetName: "rawData" | "archive", source: ReadingSource) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    sheetsProcessed.push(sheetName);

    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });

    for (const row of rows) {
      const node = toStringOrUndefined(row["Node"]);
      const ts = toDateOrNull(row["Timestamp"]);
      if (!node || !ts) {
        // if Node or Timestamp missing/invalid, skip the row
        continue;
      }

      const reading: ParsedReadingRow = {
        node,
        timestamp: ts,
        temperature: toNumber(row["Temperature"]),
        pressure: toNumber(row["Pressure"]),
        humidity: toNumber(row["Humidity"]),
        dendrometer: toNumber(row["Dendrometer"]),
        sapflow1: toNumber(row["Sapflow1"]),
        sapflow2: toNumber(row["Sapflow2"]),
        sapflow3: toNumber(row["Sapflow3"]),
        sapflow4: toNumber(row["Sapflow4"]),
        battery: toNumber(row["Battery"]),
        // LiPo Charge exists only on rawData sheet
        lipoCharge: source === "rawData" ? toNumber(row["LiPo Charge"]) : undefined,
        notes: toStringOrUndefined(row["Notes"]),
        source,
      };

      readings.push(reading);
    }
  };

  parseReadingSheet("rawData", "rawData");
  parseReadingSheet("archive", "archive");

  return {
    nodeInfo,
    readings,
    sheetsProcessed,
  };
}
