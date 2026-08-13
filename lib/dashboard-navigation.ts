export type DashboardCapabilities = {
  orders: boolean;
  bookings: boolean;
  feedback: boolean;
  exams: boolean;
};

export function resolveDashboardCapabilities(
  rows: Array<{ qr_type?: string | null }> | null | undefined,
): DashboardCapabilities {
  const types = new Set((rows ?? []).map((row) => row.qr_type).filter(Boolean));
  return {
    orders: types.has("menu"),
    bookings: types.has("booking"),
    feedback: types.has("feedback"),
    exams: types.has("quiz"),
  };
}
