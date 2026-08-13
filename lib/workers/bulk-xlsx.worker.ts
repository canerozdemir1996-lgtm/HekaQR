import { readSheet } from "read-excel-file/web-worker";

type WorkerScope = {
  onmessage: ((event: MessageEvent<ArrayBuffer>) => void) | null;
  postMessage: (message: { table?: unknown[][]; error?: string }) => void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = async (event) => {
  try {
    const table = await readSheet(event.data);
    scope.postMessage({ table });
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : "XLSX dosyası okunamadı." });
  }
};
