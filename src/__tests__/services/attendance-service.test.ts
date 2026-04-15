import { describe, it, expect, vi, beforeEach } from 'vitest';
import { format } from 'date-fns';

// --- Firebase mock (MockTimestamp must live inside the factory — vi.mock() is hoisted) ---
vi.mock('@/lib/firebase', () => {
  class MockTimestamp {
    seconds: number;
    nanoseconds: number;
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }
    toDate() { return new Date(this.seconds * 1000); }
    static now() { return new MockTimestamp(Math.floor(Date.now() / 1000), 0); }
    static fromDate(d: Date) { return new MockTimestamp(Math.floor(d.getTime() / 1000), 0); }
  }
  return {
    db: {},
    collection: vi.fn(() => 'mock-col'),
    doc: vi.fn(() => 'mock-doc-ref'),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-attendance-id' }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    query: vi.fn((...args: unknown[]) => args),
    where: vi.fn((...args: unknown[]) => args),
    orderBy: vi.fn((...args: unknown[]) => args),
    onSnapshot: vi.fn(),
    Timestamp: MockTimestamp,
  };
});

// Mock the lazy-imported student lookup used inside addCheckIn
vi.mock('@/services/student-core-service', () => ({
  getStudentByCustomId: vi.fn(),
}));

import { getDocs } from '@/lib/firebase';
import { getStudentByCustomId } from '@/services/student-core-service';
import {
  addCheckIn,
  processCheckedInStudentsFromSnapshot,
  calculateMonthlyStudyHours,
} from '@/services/attendance-client-service';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import type { Student } from '@/types/student';

// Minimal Student fixture
const mockStudent = {
  studentId: 'S001',
  firestoreId: 'fs-id-1',
  name: 'Alice',
  activityStatus: 'Active',
  shift: 'morning',
  feeStatus: 'Paid',
  amountDue: 'Rs. 0',
  registrationDate: '2025-01-01',
  phone: '1234567890',
  address: 'Test Address',
  paymentHistory: [],
  fcmTokens: [],
} as unknown as Student;

function makeAttendanceSnapshot(studentId: string, checkInISO: string, checkOutISO?: string) {
  return {
    empty: false,
    docs: [{
      id: 'rec-1',
      data: () => ({
        studentId,
        date: format(new Date(checkInISO), 'yyyy-MM-dd'),
        checkInTime: checkInISO,
        checkOutTime: checkOutISO ?? null,
      }),
    }],
  } as unknown as QuerySnapshot<DocumentData>;
}

// ────────────────────────────────────────────
// addCheckIn — duplicate prevention
// ────────────────────────────────────────────
describe('addCheckIn — duplicate prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStudentByCustomId).mockResolvedValue(mockStudent);
  });

  it('throws when the student is already checked in', async () => {
    vi.mocked(getDocs).mockResolvedValue({
      empty: false,
      docs: [{
        id: 'existing-rec',
        data: () => ({
          studentId: 'S001',
          date: format(new Date(), 'yyyy-MM-dd'),
          checkInTime: new Date().toISOString(),
          checkOutTime: null,
        }),
      }],
    } as never);

    await expect(addCheckIn('S001')).rejects.toThrow('You are already checked in.');
  });

  it('succeeds and returns a new record when no active check-in exists', async () => {
    vi.mocked(getDocs).mockResolvedValue({ empty: true, docs: [] } as never);

    const result = await addCheckIn('S001');

    expect(result.studentId).toBe('S001');
    expect(result.recordId).toBe('new-attendance-id');
    expect(result.checkOutTime).toBeUndefined();
  });

  it('throws when the student is not found', async () => {
    vi.mocked(getStudentByCustomId).mockResolvedValue(undefined);

    await expect(addCheckIn('UNKNOWN')).rejects.toThrow('Student not found');
  });
});

// ────────────────────────────────────────────
// processCheckedInStudentsFromSnapshot — shift boundary
// ────────────────────────────────────────────
describe('processCheckedInStudentsFromSnapshot — shift boundary', () => {
  function makeStudent(shift: Student['shift']) {
    return { ...mockStudent, shift } as Student;
  }

  function checkInAt(hour: number, minute = 0): string {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }

  it('morning student at 8am is within shift', async () => {
    const result = await processCheckedInStudentsFromSnapshot(
      makeAttendanceSnapshot('S001', checkInAt(8)),
      [makeStudent('morning')],
    );
    expect(result[0].isOutsideShift).toBe(false);
  });

  it('morning student at 3pm is outside shift', async () => {
    const result = await processCheckedInStudentsFromSnapshot(
      makeAttendanceSnapshot('S001', checkInAt(15)),
      [makeStudent('morning')],
    );
    expect(result[0].isOutsideShift).toBe(true);
  });

  it('morning student at 6am (before 7) is outside shift', async () => {
    const result = await processCheckedInStudentsFromSnapshot(
      makeAttendanceSnapshot('S001', checkInAt(6)),
      [makeStudent('morning')],
    );
    expect(result[0].isOutsideShift).toBe(true);
  });

  it('evening student at 3pm is within shift', async () => {
    const result = await processCheckedInStudentsFromSnapshot(
      makeAttendanceSnapshot('S001', checkInAt(15)),
      [makeStudent('evening')],
    );
    expect(result[0].isOutsideShift).toBe(false);
  });

  it('evening student at 10pm is outside shift', async () => {
    const result = await processCheckedInStudentsFromSnapshot(
      makeAttendanceSnapshot('S001', checkInAt(22)),
      [makeStudent('evening')],
    );
    expect(result[0].isOutsideShift).toBe(true);
  });

  it('returns empty array when the snapshot is empty', async () => {
    const empty = { empty: true, docs: [] } as unknown as QuerySnapshot<DocumentData>;
    const result = await processCheckedInStudentsFromSnapshot(empty, []);
    expect(result).toHaveLength(0);
  });

  it('filters out records for students not in the allStudents list', async () => {
    const result = await processCheckedInStudentsFromSnapshot(
      makeAttendanceSnapshot('UNKNOWN', checkInAt(10)),
      [makeStudent('morning')],
    );
    expect(result).toHaveLength(0);
  });
});

// ────────────────────────────────────────────
// calculateMonthlyStudyHours
// ────────────────────────────────────────────
describe('calculateMonthlyStudyHours', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 0 when there are no attendance records', async () => {
    vi.mocked(getDocs).mockResolvedValue({ empty: true, docs: [] } as never);

    const result = await calculateMonthlyStudyHours('S001');
    expect(result).toBe(0);
  });

  it('calculates hours correctly for a completed 2-hour session', async () => {
    const checkIn = new Date(2026, 3, 10, 9, 0, 0);   // Apr 10, 09:00
    const checkOut = new Date(2026, 3, 10, 11, 0, 0); // Apr 10, 11:00 → 2 hours

    vi.mocked(getDocs).mockResolvedValue({
      empty: false,
      docs: [{
        id: 'rec-1',
        data: () => ({
          studentId: 'S001',
          date: '2026-04-10',
          checkInTime: checkIn.toISOString(),
          checkOutTime: checkOut.toISOString(),
        }),
      }],
    } as never);

    const result = await calculateMonthlyStudyHours('S001', new Date(2026, 3, 15));
    expect(result).toBe(2);
  });

  it('caps an open session at 21:30 for past days', async () => {
    // A session on a past day with no checkOut — should end at 21:30
    const pastDay = new Date(2026, 3, 5, 9, 0, 0); // Apr 5, 09:00 — no checkOut
    const expectedEnd = new Date(2026, 3, 5, 21, 30, 0);
    const expectedHours = Math.round(
      ((expectedEnd.getTime() - pastDay.getTime()) / 3_600_000) * 10,
    ) / 10;

    vi.mocked(getDocs).mockResolvedValue({
      empty: false,
      docs: [{
        id: 'rec-1',
        data: () => ({
          studentId: 'S001',
          date: '2026-04-05',
          checkInTime: pastDay.toISOString(),
          checkOutTime: null,
        }),
      }],
    } as never);

    const result = await calculateMonthlyStudyHours('S001', new Date(2026, 3, 15));
    expect(result).toBe(expectedHours);
  });
});
