import { describe, it, expect } from 'vitest';
import { isReviewerUser, getErrorMessage, REVIEWER_EMAIL } from '@/lib/auth-utils';

describe('isReviewerUser', () => {
  it('returns true for the reviewer email', () => {
    expect(isReviewerUser(REVIEWER_EMAIL)).toBe(true);
  });

  it('returns false for a regular user email', () => {
    expect(isReviewerUser('student@example.com')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isReviewerUser(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isReviewerUser(undefined)).toBe(false);
  });

  it('is case-sensitive — uppercase variant is rejected', () => {
    expect(isReviewerUser(REVIEWER_EMAIL.toUpperCase())).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isReviewerUser('')).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('returns the message for an Error instance', () => {
    expect(getErrorMessage(new Error('something broke'))).toBe('something broke');
  });

  it('coerces a plain string via String()', () => {
    expect(getErrorMessage('plain error')).toBe('plain error');
  });

  it('coerces a number via String()', () => {
    expect(getErrorMessage(42)).toBe('42');
  });

  it('coerces null via String()', () => {
    expect(getErrorMessage(null)).toBe('null');
  });

  it('coerces undefined via String()', () => {
    expect(getErrorMessage(undefined)).toBe('undefined');
  });

  it('uses the custom toString() on objects', () => {
    const obj = { toString: () => 'custom-error' };
    expect(getErrorMessage(obj)).toBe('custom-error');
  });
});
