import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveStudentsList } from '@/components/admin/LiveStudentsList';
import type { CheckedInStudentInfo } from '@/types/student';

const getInitials = (name?: string) =>
  (name ?? 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const makeStudent = (overrides: Partial<CheckedInStudentInfo> = {}): CheckedInStudentInfo => ({
  studentId: 'S001',
  firestoreId: 'fs-1',
  name: 'Alice',
  shift: 'morning',
  activityStatus: 'Active',
  feeStatus: 'Paid',
  amountDue: 'Rs. 0',
  registrationDate: '2025-01-01',
  paymentHistory: [],
  phone: '+919876543210',
  address: '123 Test St, Paharia, Varanasi',
  checkInTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  isOutsideShift: false,
  ...overrides,
} as CheckedInStudentInfo);

describe('LiveStudentsList — smoke tests', () => {
  it('shows skeleton loaders when isLoading is true', () => {
    const { container } = render(
      <LiveStudentsList
        students={[]}
        isLoading
        getInitials={getInitials}
      />,
    );
    // 4 skeleton divs are rendered
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows the empty-state message when no students are checked in', () => {
    render(
      <LiveStudentsList
        students={[]}
        isLoading={false}
        getInitials={getInitials}
      />,
    );
    expect(screen.getByText('Nobody checked in.')).toBeInTheDocument();
  });

  it('renders without crashing when students are provided', () => {
    // useVirtualizer measures DOM elements; in jsdom all measurements are 0,
    // so virtual rows may not render — we only assert the component mounts safely.
    expect(() =>
      render(
        <LiveStudentsList
          students={[makeStudent(), makeStudent({ studentId: 'S002', name: 'Bob' })]}
          isLoading={false}
          getInitials={getInitials}
          className="h-[400px] overflow-y-auto"
        />,
      ),
    ).not.toThrow();
  });

  it('accepts a custom className on the scroll container', () => {
    const { container } = render(
      <LiveStudentsList
        students={[makeStudent()]}
        isLoading={false}
        getInitials={getInitials}
        className="custom-class h-[400px] overflow-y-auto"
      />,
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
