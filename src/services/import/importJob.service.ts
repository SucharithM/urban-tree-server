import { supabase } from "../../config/supabase.client";

export type ImportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface ImportJobRow {
  id: string;
  fileName: string;
  fileSize: number;
  sheetsProcessed: string[] | null;
  status: ImportStatus;
  recordsImported: number;
  recordsSkipped: number;
  recordsFailed: number;
  warnings: any[] | null;
  errors: any[] | null;
  startedAt: string;
  completedAt: string | null;
}

export interface CreateImportJobInput {
  fileName: string;
  fileSize: number;
  status: ImportStatus;
  sheetsProcessed?: string[];
  recordsImported?: number;
  recordsSkipped?: number;
  recordsFailed?: number;
  warnings?: unknown[];
  errors?: unknown[];
}

export interface UpdateImportJobInput {
  status?: ImportStatus;
  sheetsProcessed?: string[];
  recordsImported?: number;
  recordsSkipped?: number;
  recordsFailed?: number;
  warnings?: unknown[];
  errors?: unknown[];
  completedAt?: string | null;
}

const TABLE_NAME = "import_jobs";

export async function createImportJob(input: CreateImportJobInput): Promise<ImportJobRow> {
  const payload = {
    fileName: input.fileName,
    fileSize: input.fileSize,
    status: input.status,
    sheetsProcessed: input.sheetsProcessed ?? [],
    recordsImported: input.recordsImported ?? 0,
    recordsSkipped: input.recordsSkipped ?? 0,
    recordsFailed: input.recordsFailed ?? 0,
    warnings: input.warnings ?? [],
    errors: input.errors ?? [],
  };

  const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select("*").single();

  if (error) {
    console.error("[createImportJob] Supabase error:", error);
    throw new Error("Failed to create import job");
  }

  return data as ImportJobRow;
}

export async function updateImportJob(
  id: string,
  patch: UpdateImportJobInput,
): Promise<ImportJobRow> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[updateImportJob] Supabase error:", error);
    throw new Error("Failed to update import job");
  }

  return data as ImportJobRow;
}

export async function listImportJobs(): Promise<ImportJobRow[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .order("startedAt", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[listImportJobs] Supabase error:", error);
    throw new Error("Failed to fetch import jobs");
  }

  return (data ?? []) as ImportJobRow[];
}

export async function getImportJobById(id: string): Promise<ImportJobRow | null> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("[getImportJobById] Supabase error:", error);
    throw new Error("Failed to fetch import job");
  }

  return (data as ImportJobRow | null) ?? null;
}
