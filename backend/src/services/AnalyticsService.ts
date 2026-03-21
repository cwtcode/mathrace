export type QuestionType = 'multiple_choice' | 'true_false' | 'essay' | 'fill_in_blank' | 'unknown';
export type AnswerOutcome = 'correct' | 'wrong' | 'timeout';

export interface AnswerEvent {
  id: string;
  clientId: string;
  timestampMs: number;
  questionType: QuestionType;
  category?: string;
  difficulty?: string;
  outcome: AnswerOutcome;
}

export interface AnalyticsFilters {
  clientId: string;
  fromMs?: number | undefined;
  toMs?: number | undefined;
  category?: string | undefined;
  questionType?: QuestionType | undefined;
}

export interface BreakdownRow {
  questionType: QuestionType;
  totalAnswered: number;
  correct: number;
}

export interface TimeSeriesPoint {
  key: string;
  label: string;
  totalAnswered: number;
  correct: number;
}

export interface AnalyticsSummaryResponse {
  clientId: string;
  fromMs?: number | undefined;
  toMs?: number | undefined;
  category?: string | undefined;
  questionType?: QuestionType | undefined;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
  breakdownByType: BreakdownRow[];
  seriesDaily: TimeSeriesPoint[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toDayKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

const within = (ts: number, fromMs?: number, toMs?: number) => {
  if (typeof fromMs === 'number' && ts < fromMs) return false;
  if (typeof toMs === 'number' && ts > toMs) return false;
  return true;
};

export class AnalyticsService {
  private static events: AnswerEvent[] = [];

  public static recordAnswerEvent(event: AnswerEvent) {
    this.events.push(event);
    if (this.events.length > 200_000) {
      this.events.splice(0, this.events.length - 200_000);
    }
  }

  private static filteredEvents(filters: AnalyticsFilters) {
    return this.events.filter((e) => {
      if (e.clientId !== filters.clientId) return false;
      if (!within(e.timestampMs, filters.fromMs, filters.toMs)) return false;
      if (filters.category && e.category !== filters.category) return false;
      if (filters.questionType && e.questionType !== filters.questionType) return false;
      return true;
    });
  }

  public static getSummary(filters: AnalyticsFilters): AnalyticsSummaryResponse {
    const list = this.filteredEvents(filters);
    const totalAnswered = list.length;
    const totalCorrect = list.filter((e) => e.outcome === 'correct').length;
    const accuracy = totalAnswered === 0 ? 0 : totalCorrect / totalAnswered;

    const types: QuestionType[] = ['multiple_choice', 'true_false', 'essay', 'fill_in_blank', 'unknown'];
    const breakdownByType: BreakdownRow[] = types.map((t) => {
      const subset = list.filter((e) => e.questionType === t);
      return {
        questionType: t,
        totalAnswered: subset.length,
        correct: subset.filter((e) => e.outcome === 'correct').length,
      };
    }).filter((r) => r.totalAnswered > 0);

    const now = new Date();
    const days = 14;
    const start = addDays(now, -(days - 1));
    const byDay = new Map<string, { totalAnswered: number; correct: number }>();
    for (const e of list) {
      const key = toDayKey(new Date(e.timestampMs));
      const agg = byDay.get(key) ?? { totalAnswered: 0, correct: 0 };
      agg.totalAnswered += 1;
      if (e.outcome === 'correct') agg.correct += 1;
      byDay.set(key, agg);
    }
    const seriesDaily: TimeSeriesPoint[] = [];
    for (let i = 0; i < days; i += 1) {
      const d = addDays(start, i);
      const key = toDayKey(d);
      const agg = byDay.get(key) ?? { totalAnswered: 0, correct: 0 };
      seriesDaily.push({
        key,
        label: `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`,
        totalAnswered: agg.totalAnswered,
        correct: agg.correct,
      });
    }

    return {
      clientId: filters.clientId,
      fromMs: filters.fromMs,
      toMs: filters.toMs,
      category: filters.category,
      questionType: filters.questionType,
      totalAnswered,
      totalCorrect,
      accuracy,
      breakdownByType,
      seriesDaily,
    };
  }

  public static exportEvents(filters: AnalyticsFilters) {
    return this.filteredEvents(filters).slice().sort((a, b) => a.timestampMs - b.timestampMs);
  }
}
