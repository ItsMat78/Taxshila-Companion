import { describe, it, expect, vi, beforeEach } from 'vitest';
import { format, addDays, subDays } from 'date-fns';

// --- Firebase mock (hoisted) ---
// MockTimestamp and mockBatch must live inside the factory — vi.mock() is hoisted
// above top-level declarations so any variable defined outside is not yet initialised.
const { mockBatch } = vi.hoisted(() => {
  const mockBatch = { update: vi.fn(), set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
  return { mockBatch };
});

vi.mock('@/lib/firebase', () => {
  class MockTimestamp {
    seconds: number; nanoseconds: number;
    constructor(seconds: number, nanoseconds: number) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
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
    updateDoc: vi.fn().mockResolvedValue(undefined),
    setDoc: vi.fn().mockResolvedValue(undefined),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-id' }),
    query: vi.fn((...args: unknown[]) => args),
    where: vi.fn((...args: unknown[]) => args),
    orderBy: vi.fn((...args: unknown[]) => args),
    writeBatch: vi.fn(() => mockBatch),
    runTransaction: vi.fn(),
    arrayUnion: vi.fn((...args: unknown[]) => args),
    Timestamp: MockTimestamp,
  };
});

import { getDocs, getDoc } from '@/lib/firebase';
import { refreshAllStudentFeeStatuses } from '@/services/fee-service';

// --- Helpers ---

function makeStudentDoc(overrides: Record<string, unknown>) {
  const id = (overrides.firestoreId as string) ?? 'fs-id-1';
  const base = {
    studentId: 'S001',
    name: 'Alice',
    activityStatus: 'Active',
    shift: 'morning',
    feeStatus: 'Paid',
    amountDue: 'Rs. 0',
    nextDueDate: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    firestoreId: id,
    paymentHistory: [],
    fcmTokens: [],
    registrationDate: '2025-01-01',
    ...overrides,
  };
  return { id, data: () => base };
}

function stubFeeStructure() {
  vi.mocked(getDoc).mockResolvedValue({
    exists: () => true,
    id: 'feeSettings',
    data: () => ({ morningFee: 600, eveningFee: 600, fullDayFee: 1000 }),
  } as ReturnType<typeof getDoc> extends Promise<infer T> ? T : never);
}

// ---

describe('refreshAllStudentFeeStatuses — fee status classification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch.update.mockClear();
    mockBatch.commit.mockResolvedValue(undefined);
  });

  it('marks a Due student as Paid when nextDueDate moves into the future', async () => {
    const futureDate = format(addDays(new Date(), 5), 'yyyy-MM-dd');
    vi.mocked(getDocs).mockResolvedValue({
      docs: [makeStudentDoc({ nextDueDate: futureDate, feeStatus: 'Due' })],
      empty: false,
    } as never);
    stubFeeStructure();

    const result = await refreshAllStudentFeeStatuses();

    expect(result.updatedCount).toBe(1);
    expect(mockBatch.update).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({ feeStatus: 'Paid' }),
    );
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('marks a Paid student as Due when overdue by ≤ 5 days', async () => {
    const overdueDate = format(subDays(new Date(), 3), 'yyyy-MM-dd');
    vi.mocked(getDocs).mockResolvedValue({
      docs: [makeStudentDoc({ nextDueDate: overdueDate, feeStatus: 'Paid', amountDue: 'Rs. 0' })],
      empty: false,
    } as never);
    stubFeeStructure();

    const result = await refreshAllStudentFeeStatuses();

    expect(result.updatedCount).toBe(1);
    expect(mockBatch.update).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({ feeStatus: 'Due' }),
    );
  });

  it('marks a Paid student as Overdue when overdue by > 5 days', async () => {
    const overdueDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    vi.mocked(getDocs).mockResolvedValue({
      docs: [makeStudentDoc({ nextDueDate: overdueDate, feeStatus: 'Paid', amountDue: 'Rs. 0' })],
      empty: false,
    } as never);
    stubFeeStructure();

    const result = await refreshAllStudentFeeStatuses();

    expect(result.updatedCount).toBe(1);
    expect(mockBatch.update).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({ feeStatus: 'Overdue' }),
    );
  });

  it('sets shift-based amountDue when student has Rs. 0 and becomes Due', async () => {
    const overdueDate = format(subDays(new Date(), 3), 'yyyy-MM-dd');
    vi.mocked(getDocs).mockResolvedValue({
      docs: [makeStudentDoc({ nextDueDate: overdueDate, feeStatus: 'Paid', shift: 'evening', amountDue: 'Rs. 0' })],
      empty: false,
    } as never);
    stubFeeStructure();

    await refreshAllStudentFeeStatuses();

    expect(mockBatch.update).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({ amountDue: 'Rs. 600' }),
    );
  });

  it('skips inactive students', async () => {
    const overdueDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    vi.mocked(getDocs).mockResolvedValue({
      docs: [makeStudentDoc({ activityStatus: 'Left', nextDueDate: overdueDate })],
      empty: false,
    } as never);
    stubFeeStructure();

    const result = await refreshAllStudentFeeStatuses();

    expect(result.updatedCount).toBe(0);
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('skips students with no nextDueDate', async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [makeStudentDoc({ nextDueDate: undefined })],
      empty: false,
    } as never);
    stubFeeStructure();

    const result = await refreshAllStudentFeeStatuses();

    expect(result.updatedCount).toBe(0);
  });

  it('does not commit the batch when no updates are needed', async () => {
    const futureDate = format(addDays(new Date(), 5), 'yyyy-MM-dd');
    // Status already matches what it would be recalculated to
    vi.mocked(getDocs).mockResolvedValue({
      docs: [makeStudentDoc({ nextDueDate: futureDate, feeStatus: 'Paid', amountDue: 'Rs. 0' })],
      empty: false,
    } as never);
    stubFeeStructure();

    const result = await refreshAllStudentFeeStatuses();

    expect(result.updatedCount).toBe(0);
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });
});
