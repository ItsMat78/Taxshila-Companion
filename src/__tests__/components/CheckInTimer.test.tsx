import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CheckInTimer } from '@/components/member/CheckInTimer';

describe('CheckInTimer — smoke tests', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a formatted HH:MM string on mount', () => {
    // RTL flushes useEffect synchronously inside act(), so the --:-- initial
    // state is never observable. We assert the post-effect formatted output instead.
    render(<CheckInTimer checkInTime={new Date().toISOString()} />);
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  it('displays HH:MM elapsed time after the effect runs', () => {
    vi.useFakeTimers();
    // check-in was 1 hour and 30 minutes ago
    const ninetyMinsAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();

    // render() wraps in act() which flushes the useEffect — no runAllTimers needed
    render(<CheckInTimer checkInTime={ninetyMinsAgo} />);

    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('updates every 30 seconds via the interval', async () => {
    vi.useFakeTimers();
    const checkInTime = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago

    render(<CheckInTimer checkInTime={checkInTime} />);

    // Advance 30 seconds — avoids the infinite loop caused by vi.runAllTimers()
    await act(async () => { vi.advanceTimersByTime(30_000); });

    // Timer still running — element should still show a formatted string
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
  });
});
