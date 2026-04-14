import { getAuth } from '@/lib/firebase-admin';
import { REVIEWER_EMAIL } from '@/lib/auth-utils';

/**
 * Checks the Authorization header for a valid Firebase ID token.
 * Returns the decoded token, or null if missing/invalid.
 */
export async function getVerifiedToken(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7);
  try {
    const auth = getAuth();
    return await auth.verifyIdToken(idToken);
  } catch {
    return null;
  }
}

/**
 * Returns true if the verified token belongs to the reviewer account.
 * Use this to block write operations for reviewer users.
 */
export function isReviewerToken(decodedToken: { email?: string } | null): boolean {
  return decodedToken?.email === REVIEWER_EMAIL;
}
