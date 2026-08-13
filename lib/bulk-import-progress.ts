export type ImportRowStatus = "pending" | "processing" | "created" | "failed" | "skipped";
export type ImportBatchStatus = "processing" | "partial" | "completed" | "failed";

export interface ImportProgressRow {
  status: ImportRowStatus;
  row_number: number;
  last_retry_run_id?: string | null;
}

export function summarizeImportProgress(rows: ImportProgressRow[], retryRunId?: string | null) {
  const counts = { created: 0, failed: 0, skipped: 0, pending: 0, processing: 0 };
  let retryableFailed = 0;
  let currentRow = 0;

  for (const row of rows) {
    counts[row.status] += 1;
    if (row.status === "failed" && retryRunId && row.last_retry_run_id !== retryRunId) retryableFailed += 1;
    if (["created", "failed", "skipped"].includes(row.status)) currentRow = Math.max(currentRow, row.row_number || 0);
  }

  const remaining = counts.pending + counts.processing + retryableFailed;
  const status: ImportBatchStatus = remaining > 0
    ? "processing"
    : counts.failed > 0
      ? counts.created > 0 ? "partial" : "failed"
      : "completed";

  return {
    counts,
    retryableFailed,
    remaining,
    currentRow,
    status,
  };
}
