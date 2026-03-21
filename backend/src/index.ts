import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChallengeEngine } from './services/ChallengeEngine.js';
import { StatsService } from './services/StatsService.js';
import { OpenRouterService } from './services/OpenRouterService.js';
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
