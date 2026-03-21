import React, { useEffect, useMemo, useState } from 'react';

type StatsRange = 'daily' | 'weekly' | 'monthly';

interface StatsSeriesPoint {
  key: string;
  label: string;
  count: number;
}

interface AnswersStatsResponse {
  totalAnswers: number;
  range: StatsRange;
  series: StatsSeriesPoint[];
}

const CACHE_TTL_MS = 30_000;
const cacheKey = (range: StatsRange) => `math_racers_answers_stats_${range}`;

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toMonthKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const toWeekKey = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad2(weekNo)}`;
};

const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (d: Date, months: number) => {
  const next = new Date(d);
  next.setMonth(next.getMonth() + months);
  return next;
};

const emptySeries = (range: StatsRange): StatsSeriesPoint[] => {
  const now = new Date();
  if (range === 'daily') {
    const days = 14;
    const start = addDays(now, -(days - 1));
    return Array.from({ length: days }).map((_, i) => {
      const d = addDays(start, i);
      const key = toDayKey(d);
      return { key, label: `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`, count: 0 };
    });
  }
  if (range === 'weekly') {
    const weeks = 12;
    return Array.from({ length: weeks }).map((_, idx) => {
      const d = addDays(now, -7 * (weeks - 1 - idx));
      const key = toWeekKey(d);
      return { key, label: key, count: 0 };
    });
  }
  const months = 12;
  const start = addMonths(now, -(months - 1));
  return Array.from({ length: months }).map((_, i) => {
    const d = addMonths(start, i);
    const key = toMonthKey(d);
    return { key, label: key, count: 0 };
  });
};

const loadCached = (range: StatsRange): AnswersStatsResponse | null => {
  const raw = localStorage.getItem(cacheKey(range));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { ts: number; data: AnswersStatsResponse };
    if (!parsed?.ts || !parsed?.data) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

const saveCached = (range: StatsRange, data: AnswersStatsResponse) => {
  localStorage.setItem(cacheKey(range), JSON.stringify({ ts: Date.now(), data }));
};

const bumpCached = (range: StatsRange) => {
  const cached = loadCached(range);
  if (!cached) return null;

  const next: AnswersStatsResponse = {
    ...cached,
    totalAnswers: cached.totalAnswers + 1,
    series: cached.series.map((p) => ({ ...p })),
  };

  const lastIndex = next.series.length - 1;
  if (lastIndex >= 0) {
    next.series[lastIndex].count += 1;
  }

  saveCached(range, next);
  return next;
};

const getErrorMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  return String(e);
};

export default function HomeDashboard({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  totalPoints = 0,
}: {
  apiBaseUrl?: string;
  totalPoints?: number;
}) {
  const [range, setRange] = useState<StatsRange>('daily');
  const [data, setData] = useState<AnswersStatsResponse | null>(() => loadCached('daily') ?? ({
    totalAnswers: 0,
    range: 'daily',
    series: emptySeries('daily'),
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const showBackendHint = apiBaseUrl === '/api' && (error?.includes('HTTP 500') || error?.toLowerCase().includes('failed to fetch'));

  const max = useMemo(() => Math.max(1, ...(data?.series?.map((p) => p.count) ?? [1])), [data]);

  useEffect(() => {
    const cached = loadCached(range);
    if (cached) setData(cached);

    let cancelled = false;
    setLoading(true);
    setError(null);
    setUsingCache(false);

    const fetchWithRetry = async () => {
      const url = `${apiBaseUrl}/stats/answers?range=${range}`;
      const maxAttempts = 3;
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 8000);
          const r = await fetch(url, { signal: controller.signal });
          window.clearTimeout(timeout);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as AnswersStatsResponse;
        } catch (e) {
          lastError = e;
          const delay = 250 * Math.pow(2, attempt - 1);
          await new Promise((res) => window.setTimeout(res, delay));
        }
      }
      throw lastError;
    };

    fetchWithRetry()
      .then((next) => {
        if (cancelled) return;
        setData(next);
        saveCached(range, next);
      })
      .catch((e) => {
        if (cancelled) return;
        const cachedFallback = loadCached(range);
        if (cachedFallback) {
          setData(cachedFallback);
          setUsingCache(true);
        } else {
          const fallback: AnswersStatsResponse = { totalAnswers: 0, range, series: emptySeries(range) };
          setData(fallback);
          setUsingCache(true);
        }
        setError(getErrorMessage(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, range, refreshNonce]);

  useEffect(() => {
    if (!error) return;
    const t = window.setInterval(() => {
      setRefreshNonce((n) => n + 1);
    }, 10_000);
    return () => window.clearInterval(t);
  }, [error]);

  useEffect(() => {
    const handler: EventListener = () => {
      const bumped = bumpCached(range);
      if (bumped) setData(bumped);
    };
    window.addEventListener('answer-submitted', handler);
    return () => window.removeEventListener('answer-submitted', handler);
  }, [range]);

  return (
    <section aria-label="Homepage dashboard" style={{
      textAlign: 'left',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div className="home-card" style={{ padding: '14px' }}>
          <div style={{ color: '#64748b', fontWeight: 900 }}>Total Questions Answered</div>
          <div data-testid="total-answers" style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {data?.totalAnswers ?? 0}
          </div>
        </div>

        <div className="home-card" style={{ padding: '14px' }}>
          <div style={{ color: '#64748b', fontWeight: 900 }}>Total Points Gained</div>
          <div data-testid="total-points" style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
            {totalPoints}
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Trend range" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        {(['daily', 'weekly', 'monthly'] as StatsRange[]).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={range === r}
            onClick={() => setRange(r)}
            className="home-button"
            data-active={range === r}
          >
            {r}
          </button>
        ))}
      </div>

      <div style={{ marginTop: '1rem' }}>
        {loading && (
          <div style={{ color: '#64748b', fontWeight: 700 }}>Loading…</div>
        )}
        {error && (
          <div role="alert" style={{ color: '#b91c1c', fontWeight: 800 }}>
            <div>
              Failed to load stats: {error}{usingCache ? ' (showing cached data)' : ''}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
              <span style={{ color: '#7f1d1d', fontWeight: 700 }}>
                {showBackendHint ? 'Backend/proxy unavailable. Start backend on http://localhost:5005' : `API: ${apiBaseUrl}`}
              </span>
              <button
                type="button"
                className="home-button"
                onClick={() => {
                  setError(null);
                  setRefreshNonce((n) => n + 1);
                }}
                style={{ padding: '8px 12px', fontWeight: 900 }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {data?.series?.length ? (
          <div aria-label="Answer trends chart" style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '6px',
            height: '120px',
            padding: '8px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
          }}>
            {data.series.map((p) => (
              <div key={p.key} style={{ minWidth: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div
                  title={`${p.label}: ${p.count}`}
                  aria-label={`${p.label}: ${p.count}`}
                  style={{
                    width: '18px',
                    height: `${Math.round((p.count / max) * 100)}%`,
                    minHeight: p.count > 0 ? '8px' : '2px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '6px',
                    transition: 'height 220ms ease',
                  }}
                />
                <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>{p.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontWeight: 700 }}>No trend data yet</div>
        )}
      </div>
    </section>
  );
}
