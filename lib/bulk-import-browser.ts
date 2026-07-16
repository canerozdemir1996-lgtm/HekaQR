import {
  MAX_BULK_FILE_BYTES,
  parseBulkCsv,
  parseBulkTable,
  type BulkParseResult,
} from "@/lib/bulk-import";

function readBulkWorkbookInWorker(buffer: ArrayBuffer): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./workers/bulk-xlsx.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ table?: unknown[][]; error?: string }>) => {
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.table ?? []);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "XLSX worker başlatılamadı."));
    };
    worker.postMessage(buffer, [buffer]);
  });
}

export async function parseBulkFileInBrowser(file: File): Promise<BulkParseResult> {
  const sourceFormat = /\.xlsx?$/i.test(file.name) ? "xlsx" : "csv";
  if (file.size > MAX_BULK_FILE_BYTES) {
    return {
      rows: [], headers: [], sourceFormat, table: [], mapping: {},
      issues: [{ row: 0, code: "INVALID_VALUE", message: "Dosya boyutu 10 MB sınırını aşıyor." }],
    };
  }
  if (sourceFormat === "xlsx") {
    return parseBulkTable(await readBulkWorkbookInWorker(await file.arrayBuffer()), "xlsx");
  }
  return parseBulkCsv(await file.text());
}
