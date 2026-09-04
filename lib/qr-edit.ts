export function usesEditableUrlField(qrType: string) {
  return qrType === "url" || qrType === "product";
}

export function staticQrPayloadForUpdate(
  qrMode: string | null | undefined,
  requestedTarget: string | undefined,
) {
  return qrMode === "static" && requestedTarget !== undefined
    ? requestedTarget
    : undefined;
}
