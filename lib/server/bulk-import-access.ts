export type BulkOrganizationMembership = {
  role?: string | null;
  status?: string | null;
} | null;

export type BulkFolderAccess = {
  user_id?: string | null;
} | null;

export type BulkStyleAccess = {
  user_id?: string | null;
  visibility?: string | null;
} | null;

export function canManageBulkImportForOrganization(membership: BulkOrganizationMembership) {
  return membership?.status === "active" && ["owner", "admin", "editor"].includes(String(membership.role));
}

export function canUseBulkImportFolder(folder: BulkFolderAccess, userId: string) {
  return folder?.user_id === userId;
}

export function canUseBulkImportStyle(style: BulkStyleAccess, userId: string) {
  return style?.user_id === userId || style?.visibility === "system" || style?.visibility === "public";
}
