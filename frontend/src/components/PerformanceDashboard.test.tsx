import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PerformanceDashboard from './PerformanceDashboard';

describe('PerformanceDashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders summary and AI feedback', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/analytics/summary')) {
        return new Response(JSON.stringify({
          clientId: 'c',
          totalAnswered: 10,
          totalCorrect: 7,
          accuracy: 0.7,
          breakdownByType: [{ questionType: 'fill_in_blank', totalAnswered: 10, correct: 7 }],
          seriesDaily: Array.from({ length: 14 }).map((_, i) => ({ key: String(i), label: `d${i}`, totalAnswered: 1, correct: 1 })),
        }), { status: 200 });
      }
      if (url.includes('/feedback/analytics') && init?.method === 'POST') {
        return new Response(JSON.stringify({ feedback: 'Keep going!' }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch);

    render(<PerformanceDashboard apiBaseUrl="http://example.test/api" onBack={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Total Answered')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Accuracy')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Keep going!')).toBeInTheDocument();
    });
  });

  it('exports csv when clicking export button', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn(() => {});
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/analytics/summary')) {
        return new Response(JSON.stringify({
          clientId: 'c',
          totalAnswered: 0,
          totalCorrect: 0,
          accuracy: 0,
          breakdownByType: [],
          seriesDaily: Array.from({ length: 14 }).map((_, i) => ({ key: String(i), label: `d${i}`, totalAnswered: 0, correct: 0 })),
        }), { status: 200 });
      }
      if (url.includes('/feedback/analytics') && init?.method === 'POST') {
        return new Response(JSON.stringify({ feedback: '—' }), { status: 200 });
      }
      if (url.includes('/analytics/export') && url.includes('format=csv')) {
        return new Response('timestampMs,questionType\n', { status: 200, headers: { 'Content-Type': 'text/csv' } });
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch);

    render(<PerformanceDashboard apiBaseUrl="http://example.test/api" onBack={() => {}} />);

    const btn = await screen.findByText('Export CSV');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();
    });
  });

  it('refreshes on answer-submitted event', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/analytics/summary')) {
        return new Response(JSON.stringify({
          clientId: 'c',
          totalAnswered: 1,
          totalCorrect: 1,
          accuracy: 1,
          breakdownByType: [{ questionType: 'fill_in_blank', totalAnswered: 1, correct: 1 }],
          seriesDaily: Array.from({ length: 14 }).map((_, i) => ({ key: String(i), label: `d${i}`, totalAnswered: 0, correct: 0 })),
        }), { status: 200 });
      }
      if (url.includes('/feedback/analytics') && init?.method === 'POST') {
        return new Response(JSON.stringify({ feedback: 'ok' }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchSpy as unknown as typeof fetch);

    render(<PerformanceDashboard apiBaseUrl="http://example.test/api" onBack={() => {}} />);

    await screen.findByText('Total Answered');

    const before = fetchSpy.mock.calls.filter((c) => String(c[0]).includes('/analytics/summary')).length;
    window.dispatchEvent(new CustomEvent('answer-submitted', { detail: { timestampMs: Date.now() } }));

    await waitFor(() => {
      const after = fetchSpy.mock.calls.filter((c) => String(c[0]).includes('/analytics/summary')).length;
      expect(after).toBeGreaterThan(before);
    });
  });
});
