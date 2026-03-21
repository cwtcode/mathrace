export type StatsRange = 'daily' | 'weekly' | 'monthly';

export interface StatsSeriesPoint {
  key: string;
  label: string;
  count: number;
}

export interface AnswersStatsResponse {
  totalAnswers: number;
  range: StatsRange;
  series: StatsSeriesPoint[];
}

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

export class StatsService {
  private static totalAnswers = 0;
  private static dayCounts = new Map<string, number>();
  private static weekCounts = new Map<string, number>();
  private static monthCounts = new Map<string, number>();

  public static recordAnswer(timestampMs: number = Date.now()) {
    const d = new Date(timestampMs);
    this.totalAnswers += 1;

    const dayKey = toDayKey(d);
    this.dayCounts.set(dayKey, (this.dayCounts.get(dayKey) ?? 0) + 1);

    const weekKey = toWeekKey(d);
    this.weekCounts.set(weekKey, (this.weekCounts.get(weekKey) ?? 0) + 1);

    const monthKey = toMonthKey(d);
    this.monthCounts.set(monthKey, (this.monthCounts.get(monthKey) ?? 0) + 1);
  }

  public static getAnswersStats(range: StatsRange): AnswersStatsResponse {
    const now = new Date();

    if (range === 'daily') {
      const days = 14;
      const start = addDays(now, -(days - 1));
      const series: StatsSeriesPoint[] = [];
      for (let i = 0; i < days; i += 1) {
        const d = addDays(start, i);
        const key = toDayKey(d);
        series.push({
          key,
          label: `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`,
          count: this.dayCounts.get(key) ?? 0,
        });
      }
      return { totalAnswers: this.totalAnswers, range, series };
    }

    if (range === 'weekly') {
      const weeks = 12;
      const series: StatsSeriesPoint[] = [];
      for (let i = weeks - 1; i >= 0; i -= 1) {
        const d = addDays(now, -7 * i);
        const key = toWeekKey(d);
        series.push({
          key,
          label: key,
          count: this.weekCounts.get(key) ?? 0,
        });
      }
      return { totalAnswers: this.totalAnswers, range, series };
    }

    const months = 12;
    const start = addMonths(now, -(months - 1));
    const series: StatsSeriesPoint[] = [];
    for (let i = 0; i < months; i += 1) {
      const d = addMonths(start, i);
      const key = toMonthKey(d);
      series.push({
        key,
        label: key,
        count: this.monthCounts.get(key) ?? 0,
      });
    }
    return { totalAnswers: this.totalAnswers, range, series };
  }
}

