import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock firebase-admin ---
const mockStudentDocs = [
  {
    id: 'fs-1',
    data: () => ({
      studentId: 'S001',
      name: 'Alice',
      email: 'alice@example.com',
      shift: 'morning',
      activityStatus: 'Active',
      feeStatus: 'Paid',
      paymentHistory: [
        { paymentId: 'P1', date: '2026-03-01', amount: 'Rs. 600', method: 'Cash', transactionId: 'TXN1' },
      ],
    }),
  },
];
const mockAdminDb = {
  collection: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({ docs: mockStudentDocs }),
  })),
};
const mockAdminAuth = {
  listUsers: vi.fn().mockResolvedValue({
    users: [{ uid: 'u1', email: 'alice@example.com', phoneNumber: null, displayName: 'Alice', disabled: false, metadata: { creationTime: '2025-01-01', lastSignInTime: '2026-04-01' } }],
    pageToken: undefined,
  }),
};

vi.mock('@/lib/firebase-admin', () => ({
  getDb: vi.fn(() => mockAdminDb),
  getAuth: vi.fn(() => mockAdminAuth),
}));

// Mock jszip — must be a class so `new JSZip()` works
vi.mock('jszip', () => {
  class MockJSZip {
    file = vi.fn();
    generateAsync = vi.fn().mockResolvedValue(Buffer.from('mock-zip-content'));
  }
  return { default: MockJSZip };
});

import { GET } from '@/app/api/admin/export-data/route';

describe('GET /api/admin/export-data', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a 200 response with application/zip content-type', async () => {
    const req = new Request('http://localhost/api/admin/export-data');
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
  });

  it('includes a Content-Disposition header with a filename', async () => {
    const res = await GET();

    const disposition = res.headers.get('Content-Disposition');
    expect(disposition).toMatch(/attachment/);
    expect(disposition).toMatch(/taxshila-backup/);
  });

  it('fetches from the expected Firestore collections', async () => {
    await GET();

    const collectionCalls = vi.mocked(mockAdminDb.collection).mock.calls.map(c => (c as unknown as string[])[0]);
    expect(collectionCalls).toContain('students');
    expect(collectionCalls).toContain('attendanceRecords');
    expect(collectionCalls).toContain('feedbackItems');
  });
});
