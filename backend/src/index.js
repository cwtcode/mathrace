import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChallengeEngine } from './services/ChallengeEngine.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Backend is running!');
});
/**
 * Initialize a new challenge session
 */
app.get('/api/challenge/start', (req, res) => {
    const initialState = {
        level: 1,
        consecutiveCorrect: 0,
        consecutiveWrong: 0
    };
    const problem = ChallengeEngine.generateProblem(initialState.level);
    res.json({ state: initialState, problem });
});
/**
 * Update challenge state based on performance and get the next problem
 */
app.post('/api/challenge/next', (req, res) => {
    const { state, isCorrect } = req.body;
    if (!state) {
        return res.status(400).json({ error: 'State is required' });
    }
    const newState = ChallengeEngine.updateState(state, isCorrect);
    const problem = ChallengeEngine.generateProblem(newState.level);
    res.json({ state: newState, problem });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map