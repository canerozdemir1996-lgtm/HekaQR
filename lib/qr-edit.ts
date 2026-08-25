export function usesEditableUrlField(qrType: string) {
  return qrType === "url" || qrType === "product";
}

export function staticQrTargetChanged(
  requestedTarget: string | undefined,
  existingStaticPayload: string | null | undefined,
  existingTargetUrl: string | null | undefined,
) {
  return requestedTarget !== undefined && requestedTarget !== (existingStaticPayload ?? existingTargetUrl);
}
