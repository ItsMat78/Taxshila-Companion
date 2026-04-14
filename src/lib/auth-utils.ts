/**
 * Centralised auth helpers.
 * Keep all role/permission checks here so they can be updated in one place.
 */

/**
 * The reviewer account is a read-only guest admin.
 * To change this account, update the email here AND update the corresponding
 * Firebase Auth user via the Admin > Manage page (/admin/manage).
 */
export const REVIEWER_EMAIL = 'guest-admin@taxshila-auth.com';

/**
 * Returns true when the signed-in user is in read-only reviewer mode.
 * Use this instead of repeating the raw email comparison throughout the codebase.
 */
export function isReviewerUser(email: string | null | undefined): boolean {
  return email === REVIEWER_EMAIL;
}

/**
 * Extracts a human-readable message from an unknown catch value.
 * Use in catch blocks instead of `(error as any).message`.
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
