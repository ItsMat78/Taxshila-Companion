import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// --- Mock firebase-admin ---
const mockBatch = {
  set: vi.fn(),
  update: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
};
const mockStudentsRef = {
  where: vi.fn().mockReturnThis(),
  get: vi.fn(),
  doc: vi.fn(() => ({ id: 'new-id' })),
};
const mockAttendanceRef = {
  doc: vi.fn(() => ({ id: 'new-att-id' })),
};
const mockAdminDb = {
  batch: vi.fn(() => mockBatch),
  collection: vi.fn((name: string) => (name === 'students' ? mockStudentsRef : mockAttendanceRef)),
};

vi.mock('@/lib/firebase-admin', () => ({
  getDb: vi.fn(() => mockAdminDb),
  getAuth: vi.fn(),
}));

// --- Mock api-auth ---
vi.mock('@/lib/api-auth', () => ({
  getVerifiedToken: vi.fn(),
  isReviewerToken: vi.fn(),
}));

import { getVerifiedToken, isReviewerToken } from '@/lib/api-auth';
import { POST } from '@/app/api/admin/import-data/route';

function makeRequest(body: unknown, authHeader?: string): Request {
  return new Request('http://localhost/api/admin/import-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/import-data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch.commit.mockResolvedValue(undefined);
    vi.mocked(getVerifiedToken).mockResolvedValue(null);
    vi.mocked(isReviewerToken).mockReturnValue(false);
    mockStudentsRef.get.mockResolvedValue({ empty: true, docs: [] });
  });

  it('returns 403 when the request comes from the reviewer account', async () => {
    vi.mocked(getVerifiedToken).mockResolvedValue({ email: 'reviewer@test.com', uid: 'r1' } as never);
    vi.mocked(isReviewerToken).mockReturnValue(true);

    const res = await POST(makeRequest({ type: 'students', data: [] }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/reviewer mode/i);
  });

  it('returns 400 when the request body is missing the required fields', async () => {
    const res = await POST(makeRequest({ type: 'students' })); // missing data

    expect(res.status).toBe(400);
  });

  it('returns 400 when type is missing', async () => {
    const res = await POST(makeRequest({ data: [] }));

    expect(res.status).toBe(400);
  });

  it('imports students and returns success', async () => {
    const res = await POST(makeRequest({
      type: 'students',
      data: [{ studentId: 'S001', name: 'Alice' }],
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/students/i);
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('imports attendance and returns success', async () => {
    const res = await POST(makeRequest({
      type: 'attendance',
      data: [{ studentId: 'S001', date: '2026-04-15', checkInTime: '09:00' }],
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('returns 501 for payment import (not yet supported)', async () => {
    const res = await POST(makeRequest({ type: 'payments', data: [] }));

    expect(res.status).toBe(501);
  });

  it('returns 400 for an unknown type', async () => {
    const res = await POST(makeRequest({ type: 'unknown_type', data: [] }));

    expect(res.status).toBe(400);
  });
});
