export const PRIMARY_ADMIN_EMAIL = 'pindahserverezeer@gmail.com';

export const AUTHORIZED_ADMIN_EMAILS: string[] = [
  PRIMARY_ADMIN_EMAIL,
];

/**
 * Checks if a given email is in the authorized admin list.
 */
export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return AUTHORIZED_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === normalized);
}
