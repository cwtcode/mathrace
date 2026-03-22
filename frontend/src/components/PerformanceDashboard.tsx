import { useEffect, useMemo, useState } from 'react';
import { getClientId } from '../utils/clientId';

type QuestionType = 'multiple_choice' | 'true_false' | 'essay' | 'fill_in_blank' | 'unknown';

interface BreakdownRow {
  questionType: QuestionType;
  totalAnswered: number;
  correct: number;
}

interface TimeSeriesPoint {
  key: string;
  label: string;
  totalAnswered: number;
  correct: number;
}

interface AnalyticsSummaryResponse {
  clientId: string;
  fromMs?: number;
  toMs?: number;
  category?: string;
  questionType?: QuestionType;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  breakdownByType: BreakdownRow[];
  seriesDaily: TimeSeriesPoint[];
}

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const toISODateInput = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const fromISODateInput = (s: string) => {
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
};

export default function PerformanceDashboard({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  onBack,
}: {
  apiBaseUrl?: string;
  onBack: () => void;
}) {
  const clientId = useMemo(() => getClientId(), []);
  const [category, setCategory] = useState<string>('all');
  const [questionType, setQuestionType] = useState<QuestionType | 'all'>('all');
  const [datePreset, setDatePreset] = useState<'7d' | '30d' | 'all' | 'custom'>('30d');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const query = useMemo(() => {
    let fromMs: number | undefined;
    let toMs: number | undefined;
    const now = Date.now();

    if (datePreset === '7d') fromMs = now - 7 * 24 * 60 * 60 * 1000;
    if (datePreset === '30d') fromMs = now - 30 * 24 * 60 * 60 * 1000;
    if (datePreset === 'custom') {
      const fm = from ? fromISODateInput(from) : null;
      const tm = to ? fromISODateInput(to) : null;
      if (fm !== null) fromMs = fm;
      if (tm !== null) toMs = tm + 24 * 60 * 60 * 1000 - 1;
    }

    const params = new URLSearchParams();
    params.set('clientId', clientId);
    if (typeof fromMs === 'number') params.set('fromMs', String(fromMs));
    if (typeof toMs === 'number') params.set('toMs', String(toMs));
    if (category !== 'all') params.set('category', category);
    if (questionType !== 'all') params.set('questionType', questionType);
    return { params, fromMs, toMs };
  }, [clientId, category, questionType, datePreset, from, to]);

  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setAiFeedback(null);

    const cacheKey = `math_racers_analytics_summary_${query.params.toString()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { ts: number; data: AnalyticsSummaryResponse };
        if (Date.now() - parsed.ts < 30_000) setSummary(parsed.data);
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    let cancelled = false;
    fetch(`${apiBaseUrl}/analytics/summary?${query.params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as AnalyticsSummaryResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, query, nonce]);

  useEffect(() => {
    if (!summary) return;
    setAiLoading(true);
    let cancelled = false;
    fetch(`${apiBaseUrl}/feedback/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: {
          totalAnswered: summary.totalAnswered,
          totalCorrect: summary.totalCorrect,
          accuracy: summary.accuracy,
          breakdownByType: summary.breakdownByType,
          seriesDaily: summary.seriesDaily,
          category: summary.category,
          questionType: summary.questionType,
          fromMs: summary.fromMs,
          toMs: summary.toMs,
        },
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ feedback: string }>;
      })
      .then((d) => {
        if (cancelled) return;
        setAiFeedback(String(d.feedback ?? ''));
      })
      .catch(() => {
        if (cancelled) return;
        setAiFeedback('Nice work! Keep practicing consistently and focus on your weakest areas.');
      })
      .finally(() => {
        if (cancelled) return;
        setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, summary]);

  useEffect(() => {
    const handler: EventListener = () => {
      setNonce((n) => n + 1);
    };
    window.addEventListener('answer-submitted', handler);
    return () => window.removeEventListener('answer-submitted', handler);
  }, []);

  const maxAnswered = useMemo(() => Math.max(1, ...(summary?.breakdownByType?.map((r) => r.totalAnswered) ?? [1])), [summary]);
  const maxDaily = useMemo(() => Math.max(1, ...(summary?.seriesDaily?.map((p) => p.totalAnswered) ?? [1])), [summary]);
  const improvement = useMemo(() => {
    const s = summary?.seriesDaily ?? [];
    const left = s.slice(0, 7);
    const right = s.slice(-7);
    const acc = (arr: TimeSeriesPoint[]) => {
      const t = arr.reduce((sum, p) => sum + p.totalAnswered, 0);
      const c = arr.reduce((sum, p) => sum + p.correct, 0);
      return t === 0 ? 0 : c / t;
    };
    return { prev: acc(left), recent: acc(right) };
  }, [summary]);

  const exportData = async (format: 'csv' | 'json') => {
    const params = new URLSearchParams(query.params.toString());
    params.set('format', format);
    const r = await fetch(`${apiBaseUrl}/analytics/export?${params.toString()}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const blob = await r.blob();
    downloadBlob(blob, format === 'csv' ? 'performance.csv' : 'performance.json');
  };

  useEffect(() => {
    if (datePreset !== 'custom') return;
    if (!from) setFrom(toISODateInput(Date.now() - 30 * 24 * 60 * 60 * 1000));
    if (!to) setTo(toISODateInput(Date.now()));
  }, [datePreset, from, to]);

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, color: '#1e293b' }}>Performance Dashboard</h1>
        <button type="button" className="home-button" onClick={onBack}>
          ← Back
        </button>
      </div>

      <div className="home-layout" style={{ marginTop: '16px' }}>
        <section className="home-left" aria-label="Filters">
          <div className="home-card" style={{ marginBottom: '16px' }}>
            <div style={{ color: '#64748b', fontWeight: 900, marginBottom: '10px' }}>Filters</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                Date Range
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(['7d', '30d', 'all', 'custom'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="home-button"
                      data-active={datePreset === p}
                      aria-pressed={datePreset === p}
                      onClick={() => setDatePreset(p)}
                      style={{ padding: '8px 12px' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </label>

              {datePreset === 'custom' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ display: 'grid', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                    From
                    <input value={from} onChange={(e) => setFrom(e.target.value)} type="date" style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(139, 30, 63, 0.28)' }} />
                  </label>
                  <label style={{ display: 'grid', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                    To
                    <input value={to} onChange={(e) => setTo(e.target.value)} type="date" style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(139, 30, 63, 0.28)' }} />
                  </label>
                </div>
              )}

              <label style={{ display: 'grid', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                Category
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(139, 30, 63, 0.28)', background: 'var(--seashell)', color: 'var(--ink)' }}>
                  <option value="all">All</option>
                  <option value="number">number</option>
                  <option value="measures">measures</option>
                  <option value="shape">shape</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: '6px', fontWeight: 800, color: '#0f172a' }}>
                Question Type
                <select
                  value={questionType}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === 'all' ||
                      value === 'fill_in_blank' ||
                      value === 'multiple_choice' ||
                      value === 'true_false' ||
                      value === 'essay' ||
                      value === 'unknown'
                    ) {
                      setQuestionType(value);
                    }
                  }}
                  style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(139, 30, 63, 0.28)', background: 'var(--seashell)', color: 'var(--ink)' }}
                >
                  <option value="all">All</option>
                  <option value="fill_in_blank">fill-in-the-blank</option>
                  <option value="multiple_choice">multiple choice</option>
                  <option value="true_false">true/false</option>
                  <option value="essay">essay</option>
                </select>
              </label>

              <button
                type="button"
                className="home-button"
                onClick={() => setNonce((n) => n + 1)}
                style={{ width: 'fit-content' }}
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="home-card">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="home-button" onClick={() => exportData('csv')}>
                Export CSV
              </button>
              <button type="button" className="home-button" onClick={() => exportData('json')}>
                Export JSON
              </button>
            </div>
          </div>
        </section>

        <section className="home-right" aria-label="Analytics">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="home-card">
              <div style={{ color: '#64748b', fontWeight: 900 }}>Total Answered</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{summary?.totalAnswered ?? 0}</div>
            </div>
            <div className="home-card">
              <div style={{ color: '#64748b', fontWeight: 900 }}>Total Correct</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{summary?.totalCorrect ?? 0}</div>
            </div>
            <div className="home-card">
              <div style={{ color: '#64748b', fontWeight: 900 }}>Accuracy</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{Math.round((summary?.accuracy ?? 0) * 100)}%</div>
            </div>
          </div>

          <div className="home-card" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ color: '#64748b', fontWeight: 900 }}>Progress (last 14 days)</div>
              <div style={{ color: '#0f172a', fontWeight: 900 }}>
                Trend: {Math.round(improvement.prev * 100)}% → {Math.round(improvement.recent * 100)}%
              </div>
            </div>

            <div aria-label="Progress chart" style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '130px', marginTop: '12px', overflowX: 'auto' }}>
              {(summary?.seriesDaily ?? []).map((p) => (
                <div key={p.key} style={{ minWidth: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '22px', height: `${Math.round((p.totalAnswered / maxDaily) * 100)}%`, minHeight: p.totalAnswered > 0 ? '10px' : '2px', borderRadius: '8px', backgroundColor: 'rgba(139, 30, 63, 0.28)' }} />
                  <div style={{ width: '22px', height: `${Math.round((p.correct / maxDaily) * 100)}%`, marginTop: '-100%', minHeight: p.correct > 0 ? '10px' : '0px', borderRadius: '8px', backgroundColor: 'var(--garnet)', transition: 'height 220ms ease' }} />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="home-card" style={{ marginTop: '16px' }}>
            <div style={{ color: '#64748b', fontWeight: 900, marginBottom: '12px' }}>Correct by Question Type</div>
            {summary?.breakdownByType?.length ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {summary.breakdownByType.map((r) => (
                  <div key={r.questionType} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px', gap: '10px', alignItems: 'center' }}>
                    <div style={{ fontWeight: 900, color: '#0f172a' }}>{r.questionType}</div>
                    <div style={{ height: '12px', borderRadius: '999px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round((r.totalAnswered / maxAnswered) * 100)}%`, height: '100%', backgroundColor: 'rgba(139, 30, 63, 0.25)' }} />
                      <div style={{ width: `${Math.round((r.correct / maxAnswered) * 100)}%`, height: '100%', marginTop: '-12px', backgroundColor: 'var(--garnet)', transition: 'width 220ms ease' }} />
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                      {r.correct}/{r.totalAnswered}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontWeight: 800 }}>No data yet. Play a few questions to see analytics.</div>
            )}
          </div>

          <div className="home-card" style={{ marginTop: '16px' }}>
            <div style={{ color: '#64748b', fontWeight: 900, marginBottom: '10px' }}>AI Recommendations</div>
            {aiLoading ? (
              <div style={{ color: '#64748b', fontWeight: 800 }}>Analyzing your patterns…</div>
            ) : (
              <div style={{ color: '#0f172a', fontWeight: 700, lineHeight: 1.6 }}>{aiFeedback ?? '—'}</div>
            )}
          </div>

          {loading && <div style={{ marginTop: '12px', color: '#64748b', fontWeight: 800 }}>Loading…</div>}
          {error && (
            <div role="alert" style={{ marginTop: '12px', color: '#b91c1c', fontWeight: 900 }}>
              Failed to load analytics: {error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
