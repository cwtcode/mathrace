import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import HomeDashboard from './HomeDashboard';

describe('HomeDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders total answers from API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify({
        totalAnswers: 12,
        range: 'daily',
        series: [{ key: 'k', label: 'L', count: 12 }],
      }), { status: 200 });
    }));

    render(<HomeDashboard apiBaseUrl="http://example.test/api" totalPoints={345} />);

    await waitFor(() => {
      expect(screen.getByTestId('total-answers')).toHaveTextContent('12');
    }, { timeout: 3000 });
    expect(screen.getByTestId('total-points')).toHaveTextContent('345');
  });

  it('increments total when answer-submitted event is fired (cache-based)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response(JSON.stringify({
        totalAnswers: 3,
        range: 'daily',
        series: [{ key: 'k', label: 'L', count: 3 }],
      }), { status: 200 });
    }));

    render(<HomeDashboard apiBaseUrl="http://example.test/api" totalPoints={0} />);

    await waitFor(() => {
      expect(screen.getByTestId('total-answers')).toHaveTextContent('3');
    }, { timeout: 3000 });

    window.dispatchEvent(new CustomEvent('answer-submitted', { detail: { timestampMs: Date.now() } }));

    await waitFor(() => {
      expect(screen.getByTestId('total-answers')).toHaveTextContent('4');
    }, { timeout: 3000 });
  });

  it('falls back to cached data on fetch failure', async () => {
    localStorage.setItem('math_racers_answers_stats_daily', JSON.stringify({
      ts: Date.now(),
      data: {
        totalAnswers: 7,
        range: 'daily',
        series: [{ key: 'k', label: 'L', count: 7 }],
      },
    }));

    vi.stubGlobal('fetch', vi.fn(async () => {
      return new Response('nope', { status: 500 });
    }));

    render(<HomeDashboard apiBaseUrl="http://example.test/api" totalPoints={0} />);

    await waitFor(() => {
      expect(screen.getByTestId('total-answers')).toHaveTextContent('7');
    }, { timeout: 3000 });
  });
});
