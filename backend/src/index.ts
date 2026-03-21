import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChallengeEngine } from './services/ChallengeEngine.js';
import { StatsService } from './services/StatsService.js';
import { OpenRouterService } from './services/OpenRouterService.js';
import { AnalyticsService, type AnswerOutcome, type QuestionType } from './services/AnalyticsService.js';
import type { UserState } from './shared/challenge.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

/**
 * Initialize a new challenge session
 */
app.get('/api/challenge/start', async (req, res) => {
  const initialState: UserState = {
    level: 1,
    consecutiveCorrect: 0,
    consecutiveWrong: 0
  };
  const category = (req.query.category as string) || 'number';
  const problem = await ChallengeEngine.generateProblemAsync(initialState.level, category);
  res.json({ state: initialState, problem });
});

/**
 * Update challenge state based on performance and get the next problem
 */
app.post('/api/challenge/next', async (req, res) => {
  const { state, isCorrect, category = 'number' } = req.body;
  
  if (!state) {
    return res.status(400).json({ error: 'State is required' });
  }

  const newState = ChallengeEngine.updateState(state, isCorrect);
  const problem = await ChallengeEngine.generateProblemAsync(newState.level, category);
  
  res.json({ state: newState, problem });
});

app.get('/api/stats/answers', (req, res) => {
  const range = (req.query.range as string) || 'daily';
  if (range !== 'daily' && range !== 'weekly' && range !== 'monthly') {
    return res.status(400).json({ error: 'Invalid range. Use daily|weekly|monthly.' });
  }
  return res.json(StatsService.getAnswersStats(range));
});

app.post('/api/stats/answers', (req, res) => {
  const timestampMs = typeof req.body?.timestampMs === 'number' ? req.body.timestampMs : Date.now();
  StatsService.recordAnswer(timestampMs);
  return res.status(204).end();
});

app.post('/api/feedback/session', async (req, res) => {
  const body = req.body ?? {};
  const sessionPoints = Number(body.sessionPoints ?? 0);
  const totalAnswered = Number(body.totalAnswered ?? 0);
  const correct = Number(body.correct ?? 0);
  const wrong = Number(body.wrong ?? 0);
  const timeout = Number(body.timeout ?? 0);
  const maxCombo = Number(body.maxCombo ?? 0);
  const category = typeof body.category === 'string' ? body.category : undefined;
  const difficulty = typeof body.difficulty === 'string' ? body.difficulty : undefined;
  const ghostPace = typeof body.ghostPace === 'string' ? body.ghostPace : undefined;

  const ai = await OpenRouterService.generateSessionFeedback({
    sessionPoints,
    totalAnswered,
    correct,
    wrong,
    timeout,
    maxCombo,
    category,
    difficulty,
    ghostPace,
  });

  const fallback = `Great effort! You earned ${sessionPoints} points and answered ${totalAnswered} questions. Your best combo was ${maxCombo}. Next time, try to slow down and double-check tricky ones before submitting.`;

  return res.json({ feedback: ai ?? fallback });
});

app.post('/api/analytics/answer', (req, res) => {
  const body = req.body ?? {};
  const clientId = typeof body.clientId === 'string' ? body.clientId : '';
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  const allowedQuestionTypes: QuestionType[] = ['multiple_choice', 'true_false', 'essay', 'fill_in_blank', 'unknown'];
  const questionTypeRaw = typeof body.questionType === 'string' ? body.questionType : 'unknown';
  const questionType = (allowedQuestionTypes.includes(questionTypeRaw as QuestionType) ? questionTypeRaw : 'unknown') as QuestionType;
  const category = typeof body.category === 'string' ? body.category : undefined;
  const difficulty = typeof body.difficulty === 'string' ? body.difficulty : undefined;
  const allowedOutcomes: AnswerOutcome[] = ['correct', 'wrong', 'timeout'];
  const outcomeRaw = typeof body.outcome === 'string' ? body.outcome : 'wrong';
  const outcome = (allowedOutcomes.includes(outcomeRaw as AnswerOutcome) ? outcomeRaw : 'wrong') as AnswerOutcome;
  const timestampMs = typeof body.timestampMs === 'number' ? body.timestampMs : Date.now();
  const id = typeof body.id === 'string' ? body.id : `${timestampMs}-${Math.random().toString(16).slice(2)}`;

  AnalyticsService.recordAnswerEvent({
    id,
    clientId,
    timestampMs,
    questionType,
    category,
    difficulty,
    outcome,
  });

  return res.status(204).end();
});

app.get('/api/analytics/summary', (req, res) => {
  const clientId = (req.query.clientId as string) || '';
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  const fromMs = req.query.fromMs ? Number(req.query.fromMs) : undefined;
  const toMs = req.query.toMs ? Number(req.query.toMs) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;
  const questionType = req.query.questionType ? String(req.query.questionType) : undefined;

  return res.json(AnalyticsService.getSummary({
    clientId,
    fromMs: Number.isFinite(fromMs as any) ? (fromMs as number) : undefined,
    toMs: Number.isFinite(toMs as any) ? (toMs as number) : undefined,
    category,
    questionType: questionType as QuestionType,
  }));
});

app.get('/api/analytics/export', (req, res) => {
  const clientId = (req.query.clientId as string) || '';
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  const fromMs = req.query.fromMs ? Number(req.query.fromMs) : undefined;
  const toMs = req.query.toMs ? Number(req.query.toMs) : undefined;
  const category = req.query.category ? String(req.query.category) : undefined;
  const questionType = req.query.questionType ? String(req.query.questionType) : undefined;
  const format = (req.query.format as string) || 'json';

  const events = AnalyticsService.exportEvents({
    clientId,
    fromMs: Number.isFinite(fromMs as any) ? (fromMs as number) : undefined,
    toMs: Number.isFinite(toMs as any) ? (toMs as number) : undefined,
    category,
    questionType: questionType as QuestionType,
  });

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="performance.csv"');
    const header = 'timestampMs,questionType,category,difficulty,outcome,id\n';
    const rows = events.map((e) => `${e.timestampMs},${e.questionType},${e.category ?? ''},${e.difficulty ?? ''},${e.outcome},${e.id}`).join('\n');
    return res.send(header + rows + '\n');
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="performance.json"');
  return res.json({ events });
});

app.post('/api/feedback/analytics', async (req, res) => {
  const body = req.body ?? {};
  const summary = body.summary;
  if (!summary) return res.status(400).json({ error: 'summary is required' });

  const ai = await OpenRouterService.generateAnalyticsFeedback(summary);
  const fallback = 'Nice work! Keep practicing a little each day. Focus on the question types where your accuracy is lower, and aim for a small improvement goal next session.';
  return res.json({ feedback: ai ?? fallback });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
