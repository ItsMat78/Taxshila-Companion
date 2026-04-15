import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Star } from 'lucide-react';
import { DashboardTile } from '@/components/member/DashboardTile';

// next/link renders a plain <a> in jsdom
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string; [k: string]: unknown }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('DashboardTile — smoke tests', () => {
  it('renders the title', () => {
    render(<DashboardTile title="My Tile" icon={Star} />);
    expect(screen.getByText('My Tile')).toBeInTheDocument();
  });

  it('renders the statistic when provided', () => {
    render(<DashboardTile title="Tile" icon={Star} statistic={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders a loading spinner when isLoadingStatistic is true', () => {
    render(<DashboardTile title="Tile" icon={Star} isLoadingStatistic />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a description when no statistic is provided', () => {
    render(<DashboardTile title="Tile" icon={Star} description="Some info" />);
    expect(screen.getByText('Some info')).toBeInTheDocument();
  });

  it('wraps the tile in an <a> when href is provided', () => {
    render(<DashboardTile title="Tile" icon={Star} href="/somewhere" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/somewhere');
  });

  it('renders a <button> when an action handler is provided', () => {
    const handler = vi.fn();
    render(<DashboardTile title="Tile" icon={Star} action={handler} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not navigate when disabled', () => {
    render(<DashboardTile title="Tile" icon={Star} href="/page" disabled />);
    // disabled=true causes DashboardTile to render a <div>, not a link
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows children when no statistic is present', () => {
    render(
      <DashboardTile title="Tile" icon={Star}>
        <span>child content</span>
      </DashboardTile>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });
});
