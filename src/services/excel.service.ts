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

export type ParsedComputedReadingRow = {
  nodeId: string;
  timestamp: string;
  temperature: number | null;
  pressure: number | null;
  humidity: number | null;
  dendroRaw: number | null;
  dendroCalibratedMm: number | null;
  sapflowCmPerHr: number | null;
  sfMaxD: number | null;
  sfSignal: number | null;
  sfNoise: number | null;
  dataSource: string;
};

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
  computedReadings: ParsedComputedReadingRow[];
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
  const computedReadings: ParsedComputedReadingRow[] = [];

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
        lipoCharge: source === "rawData" ? toNumber(row["LiPo Charge"]) : undefined,
        notes: toStringOrUndefined(row["Notes"]),
        source,
      };

      readings.push(reading);
    }
  };

  function parseProcessedSheet(
    sheet: XLSX.WorkSheet,
    sheetName: string,
  ): ParsedComputedReadingRow[] {
    const rows: ParsedComputedReadingRow[] = [];

    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:O200");

    let nodeId: string | null = null;

    outerNodeLoop: for (let r = 0; r <= Math.min(range.e.r, 10); r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[addr];
        if (cell && typeof cell.v === "string" && cell.v.toUpperCase().startsWith("NODE ID")) {
          const rightCell = sheet[XLSX.utils.encode_cell({ r, c: c + 1 })];
          if (rightCell && rightCell.v != null) {
            nodeId = String(rightCell.v).trim();
            break outerNodeLoop;
          }
        }
      }
    }

    if (!nodeId) {
      // not one of the professor per-node sheets
      return rows;
    }

    // 2) Find header row with "Timestamp (Raw)"
    let headerRow = -1;

    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[addr];
        if (cell && cell.v === "Timestamp (Raw)") {
          headerRow = r;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow === -1) return rows;

    // 3) Map column labels -> indices
    const headerMap: Record<string, number> = {};
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c });
      const cell = sheet[addr];
      if (!cell || typeof cell.v !== "string") continue;
      const label = cell.v.trim();

      if (
        [
          "Timestamp (Raw)",
          "Temperature (C)",
          "Pressure (hPa)",
          "Humidity (%)",
          "Dendro (Raw)",
          "Sapflow (cm/hr)",
          "SF maxD",
          "SF Signal",
          "SF Noise",
          "Dendro (mm)",
        ].includes(label)
      ) {
        headerMap[label] = c;
      }
    }

    const tsCol = headerMap["Timestamp (Raw)"];
    if (tsCol === undefined) return rows;

    const tempCol = headerMap["Temperature (C)"];
    const presCol = headerMap["Pressure (hPa)"];
    const humCol = headerMap["Humidity (%)"];
    const dendroRawCol = headerMap["Dendro (Raw)"];
    const sapflowCol = headerMap["Sapflow (cm/hr)"];
    const sfMaxDCol = headerMap["SF maxD"];
    const sfSignalCol = headerMap["SF Signal"];
    const sfNoiseCol = headerMap["SF Noise"];
    const dendroMmCol = headerMap["Dendro (mm)"];

    const toNumber = (cell: XLSX.CellObject | undefined): number | null => {
      if (!cell || cell.v === null || cell.v === "") return null;
      if (typeof cell.v === "number") return cell.v;
      const n = Number(cell.v);
      return Number.isFinite(n) ? n : null;
    };

    // 4) Data rows
    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const tsAddr = XLSX.utils.encode_cell({ r, c: tsCol });
      const tsCell = sheet[tsAddr];
      if (!tsCell || tsCell.v == null || tsCell.v === "") {
        continue;
      }

      const timestampRaw = String(tsCell.v).trim();
      if (!timestampRaw) continue;

      rows.push({
        nodeId,
        timestamp: timestampRaw,
        temperature:
          tempCol !== undefined ? toNumber(sheet[XLSX.utils.encode_cell({ r, c: tempCol })]) : null,
        pressure:
          presCol !== undefined ? toNumber(sheet[XLSX.utils.encode_cell({ r, c: presCol })]) : null,
        humidity:
          humCol !== undefined ? toNumber(sheet[XLSX.utils.encode_cell({ r, c: humCol })]) : null,
        dendroRaw:
          dendroRawCol !== undefined
            ? toNumber(sheet[XLSX.utils.encode_cell({ r, c: dendroRawCol })])
            : null,
        sapflowCmPerHr:
          sapflowCol !== undefined
            ? toNumber(sheet[XLSX.utils.encode_cell({ r, c: sapflowCol })])
            : null,
        sfMaxD:
          sfMaxDCol !== undefined
            ? toNumber(sheet[XLSX.utils.encode_cell({ r, c: sfMaxDCol })])
            : null,
        sfSignal:
          sfSignalCol !== undefined
            ? toNumber(sheet[XLSX.utils.encode_cell({ r, c: sfSignalCol })])
            : null,
        sfNoise:
          sfNoiseCol !== undefined
            ? toNumber(sheet[XLSX.utils.encode_cell({ r, c: sfNoiseCol })])
            : null,
        dendroCalibratedMm:
          dendroMmCol !== undefined
            ? toNumber(sheet[XLSX.utils.encode_cell({ r, c: dendroMmCol })])
            : null,
        dataSource: sheetName,
      });
    }

    return rows;
  }

  const baseSheets = new Set(["nodeInfo", "rawData", "archive"]);

  for (const sheetName of workbook.SheetNames) {
    if (baseSheets.has(sheetName)) continue;

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = parseProcessedSheet(sheet, sheetName);
    if (rows.length > 0) {
      computedReadings.push(...rows);
      sheetsProcessed.push(sheetName);
    }
  }

  parseReadingSheet("rawData", "rawData");
  parseReadingSheet("archive", "archive");

  return {
    nodeInfo,
    readings,
    sheetsProcessed,
    computedReadings,
  };
}
