import React, { useState, useEffect, useRef, useCallback } from 'react';
import QuestionDisplay from './QuestionDisplay';
import NumberPad from './NumberPad';
import RaceTrack from './RaceTrack';
import ResultsScreen from './ResultsScreen';
import HomeDashboard from './HomeDashboard';
import ComboMeter from './ComboMeter';
import { addPoints, getProfile, PlayerProfile, CHARACTERS } from '../utils/storage';

type Difficulty = 'easy' | 'medium' | 'hard';
type Category = 'number' | 'measures' | 'shape';
type GhostPace = 'slow' | 'normal' | 'fast';

interface UserState {
  level: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
}

type QuestionOutcome = 'correct' | 'wrong' | 'timeout';

interface QuestionHistoryItem {
  id: string;
  question: string;
  correctAnswer: number;
  userAnswer: string;
  points: number;
  outcome: QuestionOutcome;
}

const API_BASE_URL = 'http://localhost:5005/api';

const RaceInterface: React.FC = () => {
  const QUESTION_TIME_LIMIT_SECONDS = 8;
  const [category, setCategory] = useState<Category>('number');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [ghostPace, setGhostPace] = useState<GhostPace>('slow');
  const [operands, setOperands] = useState<{a: number, b: number, operator?: string}>({ a: 7, b: 5, operator: '+' });
  const [currentQuestion, setCurrentQuestion] = useState('7 + 5');
  const [correctAnswer, setCorrectAnswer] = useState(12);
  const [explanation, setExplanation] = useState<string | undefined>();
  const [userState, setUserState] = useState<UserState>({ level: 1, consecutiveCorrect: 0, consecutiveWrong: 0 });
  const [userInput, setUserInput] = useState('');
  const [playerProgress, setPlayerProgress] = useState(0);
  const [ghostProgress, setGhostProgress] = useState(0);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'won' | 'lost' | 'ended'>('setup');
  const [errorCount, setErrorCount] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isSpeedingUp, setIsSpeedingUp] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIME_LIMIT_SECONDS);
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  
  // New state for gamification
  const [sessionPoints, setSessionPoints] = useState(0);
  const [profile, setProfile] = useState<PlayerProfile>(getProfile());
  const [newUnlocks, setNewUnlocks] = useState<string[]>([]);
  const [questionHistory, setQuestionHistory] = useState<QuestionHistoryItem[]>([]);
  const questionStartTime = useRef<number>(Date.now());
  const questionTimeoutFired = useRef(false);
  const awaitingNextQuestionRef = useRef(false);
  const comboAwardedForQuestionRef = useRef(false);
  const endGameTriggeredRef = useRef(false);

  // Get current character icon
  const currentRacerIcon = CHARACTERS.find(c => c.id === profile.currentCharacter)?.icon || '🚗';

  // Ghost speed mapping
  const GHOST_SPEEDS: Record<Difficulty, number> = {
    easy: 0.2,
    medium: 0.5,
    hard: 0.8
  };

  const GHOST_TICK_MS: Record<GhostPace, number> = {
    slow: 200,
    normal: 100,
    fast: 60,
  };

  const playCorrectSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  const calculatePoints = useCallback((timeTaken: number) => {
    const basePoints = 100;
    const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
    const speedBonus = Math.max(0, (5000 - timeTaken) / 50); // Bonus if answered under 5s
    return Math.floor((basePoints + speedBonus) * difficultyMultiplier);
  }, [difficulty]);

  const handleGameOver = useCallback((finalState: 'won' | 'lost') => {
    console.log(`[Game] Game over: ${finalState}`);
    setGameState(finalState);
    if (finalState === 'won' || finalState === 'lost') {
      setSessionPoints(currentPoints => {
        const { newUnlocks: unlocks } = addPoints(currentPoints);
        setProfile(getProfile());
        setNewUnlocks(unlocks);
        return currentPoints;
      });
    }
  }, []);

  const handleBackToHome = useCallback(() => {
    setUserInput('');
    setFeedback(null);
    setErrorCount(0);
    setIsSpeedingUp(false);
    setComboCount(0);
    setMaxCombo(0);
    setAiFeedback(null);
    setAiFeedbackLoading(false);
    setPlayerProgress(0);
    setGhostProgress(0);
    setSessionPoints(0);
    setQuestionHistory([]);
    setNewUnlocks([]);
    setProfile(getProfile());
    questionStartTime.current = Date.now();
    questionTimeoutFired.current = false;
    awaitingNextQuestionRef.current = false;
    comboAwardedForQuestionRef.current = false;
    endGameTriggeredRef.current = false;
    setQuestionTimeLeft(QUESTION_TIME_LIMIT_SECONDS);
    setGameState('setup');
  }, [QUESTION_TIME_LIMIT_SECONDS]);

  const handleEndGame = useCallback(async () => {
    if (gameState !== 'playing') return;
    if (aiFeedbackLoading) return;
    if (endGameTriggeredRef.current) return;
    endGameTriggeredRef.current = true;
    awaitingNextQuestionRef.current = true;
    setAiFeedback(null);
    setAiFeedbackLoading(true);

    const { newUnlocks: unlocks } = addPoints(sessionPoints);
    setProfile(getProfile());
    setNewUnlocks(unlocks);

    const correct = questionHistory.filter((q) => q.outcome === 'correct').length;
    const wrong = questionHistory.filter((q) => q.outcome === 'wrong').length;
    const timeout = questionHistory.filter((q) => q.outcome === 'timeout').length;
    const totalAnswered = correct + wrong + timeout;

    setGameState('ended');

    try {
      const r = await fetch(`${API_BASE_URL}/feedback/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionPoints,
          totalAnswered,
          correct,
          wrong,
          timeout,
          maxCombo,
          category,
          difficulty,
          ghostPace,
        }),
      });
      const data = await r.json();
      setAiFeedback(String(data?.feedback ?? ''));
    } catch (e) {
      setAiFeedback('Great effort! Keep practicing and try to beat your best combo next time.');
    } finally {
      setAiFeedbackLoading(false);
      awaitingNextQuestionRef.current = false;
    }
  }, [sessionPoints, questionHistory, maxCombo, category, difficulty, ghostPace, gameState, aiFeedbackLoading]);

  const reportAnswerSubmitted = useCallback((timestampMs: number) => {
    window.dispatchEvent(new CustomEvent('answer-submitted', { detail: { timestampMs } }));
    fetch(`${API_BASE_URL}/stats/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestampMs }),
    }).catch((e) => console.error('[Stats] Failed to report answer:', e));
  }, []);

  const generateLocalQuestion = useCallback(() => {
    console.log(`[Question] Generating local question for ${category} / ${difficulty}`);
    let a, b, op, ans, question;
    let maxNum = 10;
    if (difficulty === 'medium') maxNum = 20;
    if (difficulty === 'hard') maxNum = 50;

    if (category === 'number') {
      const ops = difficulty === 'easy' ? ['+', '-'] : ['+', '-', '*'];
      op = ops[Math.floor(Math.random() * ops.length)];
      
      if (op === '+') {
        a = Math.floor(Math.random() * maxNum) + 1;
        b = Math.floor(Math.random() * maxNum) + 1;
        ans = a + b;
      } else if (op === '-') {
        a = Math.floor(Math.random() * maxNum) + maxNum;
        b = Math.floor(Math.random() * maxNum) + 1;
        ans = a - b;
      } else { // Multiplication
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 5) + 1;
        ans = a * b;
      }
      question = `${a} ${op} ${b}`;
    } else if (category === 'measures') {
      const types = ['money', 'time', 'weight'];
      const type = types[Math.floor(Math.random() * types.length)];
      op = '+';
      
      if (type === 'money') {
        a = Math.floor(Math.random() * maxNum) + 1;
        b = Math.floor(Math.random() * maxNum) + 1;
        ans = a + b;
        question = `$${a} + $${b}`;
      } else if (type === 'time') {
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 6) + 1;
        ans = a + b;
        question = `${a}h + ${b}h`;
      } else {
        a = Math.floor(Math.random() * maxNum) + 1;
        b = Math.floor(Math.random() * maxNum) + 1;
        ans = a + b;
        question = `${a}kg + ${b}kg`;
      }
    } else { // shape
      const shapes = [
        { name: 'Triangle', sides: 3, vertices: 3 },
        { name: 'Square', sides: 4, vertices: 4 },
        { name: 'Pentagon', sides: 5, vertices: 5 },
        { name: 'Cube', faces: 6, vertices: 8 }
      ];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const askFor = Math.random() > 0.5 ? 'sides' : 'vertices';
      
      if (shape.name === 'Cube' && askFor === 'sides') {
        ans = 6; // Actually faces for cube in this context
        question = `Cube faces?`;
      } else {
        ans = askFor === 'sides' ? shape.sides : shape.vertices;
        question = `${shape.name} ${askFor}?`;
      }
      a = ans; b = 0; op = 'none';
    }

    setOperands({ a, b, operator: op });
    setCurrentQuestion(question);
    setCorrectAnswer(ans);
    setExplanation(undefined);
    questionStartTime.current = Date.now();
    questionTimeoutFired.current = false;
    awaitingNextQuestionRef.current = false;
    comboAwardedForQuestionRef.current = false;
    setQuestionTimeLeft(QUESTION_TIME_LIMIT_SECONDS);
  }, [category, difficulty]);

  const generateNewQuestion = useCallback(async (isCorrect?: boolean) => {
    console.log(`[API] Fetching next question (isCorrect: ${isCorrect ?? 'initial'})`);
    try {
      awaitingNextQuestionRef.current = true;
      const response = await fetch(`${API_BASE_URL}/challenge/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: userState,
          isCorrect: isCorrect ?? true,
          category
        })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      console.log('[API] New question data:', data);
      
      setUserState(data.state);
      setCurrentQuestion(data.problem.question);
      setCorrectAnswer(data.problem.answer);
      setExplanation(data.problem.explanation);
      
      // Update operands for visual aid (fallback if not provided by API)
      if (category === 'number') {
        const parts = data.problem.question.split(' ');
        setOperands({ 
          a: parseInt(parts[0]), 
          b: parseInt(parts[2]), 
          operator: parts[1] 
        });
      } else {
        setOperands({ a: data.problem.answer, b: 0, operator: 'none' });
      }
      
      questionStartTime.current = Date.now();
      questionTimeoutFired.current = false;
      awaitingNextQuestionRef.current = false;
      comboAwardedForQuestionRef.current = false;
      setQuestionTimeLeft(QUESTION_TIME_LIMIT_SECONDS);
    } catch (error) {
      console.error('[API] Failed to fetch next question:', error);
      generateLocalQuestion();
    }
  }, [category, userState, generateLocalQuestion, QUESTION_TIME_LIMIT_SECONDS]);

  const handleKeyPress = useCallback((key: string) => {
    if (gameState !== 'playing') return;
    if (awaitingNextQuestionRef.current) return;
    
    setUserInput(prevInput => {
      const newInput = prevInput + key;
      
      if (parseInt(newInput) === correctAnswer) {
        // Correct!
        if (comboAwardedForQuestionRef.current) return '';
        comboAwardedForQuestionRef.current = true;
        awaitingNextQuestionRef.current = true;
        console.log(`[Input] Correct answer: ${newInput}`);
        reportAnswerSubmitted(Date.now());
        setComboCount((c) => {
          const next = c + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });
        playCorrectSound();
        setFeedback('correct');
        setIsSpeedingUp(true);
        
        const timeTaken = Date.now() - questionStartTime.current;
        const points = calculatePoints(timeTaken);
        setSessionPoints(prevPoints => prevPoints + points);
        setQuestionHistory(prev => ([
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            question: currentQuestion,
            correctAnswer,
            userAnswer: newInput,
            points,
            outcome: 'correct',
          },
          ...prev,
        ]));

        generateNewQuestion(true);
        setPlayerProgress(prevProgress => {
          const nextProgress = prevProgress + 10;
          return nextProgress >= 100 ? nextProgress - 100 : nextProgress;
        });
        
        setErrorCount(0);
        setTimeout(() => setIsSpeedingUp(false), 1000);
        setTimeout(() => setFeedback(null), 1000);
        return ''; // Clear input
      } else if (newInput.length >= correctAnswer.toString().length) {
        // Wrong answer
        console.log(`[Input] Incorrect answer: ${newInput} (Expected: ${correctAnswer})`);
        reportAnswerSubmitted(Date.now());
        setComboCount(0);
        setQuestionHistory(prev => ([
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            question: currentQuestion,
            correctAnswer,
            userAnswer: newInput,
            points: 0,
            outcome: 'wrong',
          },
          ...prev,
        ]));
        setFeedback('incorrect');
        setErrorCount(prev => {
          const nextErrorCount = prev + 1;
          if (nextErrorCount >= 2) {
            generateNewQuestion(false);
            return 0; // Reset error count after fetching easier question
          }
          return nextErrorCount;
        });
        setTimeout(() => {
          setUserInput('');
          setFeedback(null);
        }, 500);
      }
      return newInput;
    });
  }, [gameState, correctAnswer, calculatePoints, generateNewQuestion, reportAnswerSubmitted, currentQuestion]);

  const handleClear = useCallback(() => setUserInput(''), []);
  const handleDelete = useCallback(() => setUserInput(prev => prev.slice(0, -1)), []);

  const startGame = useCallback(async (cat: Category, diff: Difficulty) => {
    console.log(`[Game] Starting game: Category=${cat}, Difficulty=${diff}`);
    setCategory(cat);
    setDifficulty(diff);
    setPlayerProgress(0);
    setGhostProgress(0);
    setSessionPoints(0);
    setNewUnlocks([]);
    setQuestionHistory([]);
    setComboCount(0);
    setMaxCombo(0);
    setAiFeedback(null);
    setAiFeedbackLoading(false);
    setErrorCount(0);
    setUserInput('');
    endGameTriggeredRef.current = false;
    
    try {
      const response = await fetch(`${API_BASE_URL}/challenge/start?category=${cat}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      console.log('[API] Initial question data:', data);
      setUserState(data.state);
      setCurrentQuestion(data.problem.question);
      setCorrectAnswer(data.problem.answer);
      setExplanation(data.problem.explanation);
      
      if (cat === 'number') {
        const parts = data.problem.question.split(' ');
        setOperands({ a: parseInt(parts[0]), b: parseInt(parts[2]), operator: parts[1] });
      } else {
        setOperands({ a: data.problem.answer, b: 0, operator: 'none' });
      }

      questionStartTime.current = Date.now();
      questionTimeoutFired.current = false;
      awaitingNextQuestionRef.current = false;
      comboAwardedForQuestionRef.current = false;
      setQuestionTimeLeft(QUESTION_TIME_LIMIT_SECONDS);
    } catch (error) {
      console.error('[API] Failed to start challenge:', error);
      generateLocalQuestion();
    }
    
    setGameState('playing');
  }, [generateLocalQuestion, QUESTION_TIME_LIMIT_SECONDS]);

  // Simple game logic for demonstration
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setGhostProgress(prev => {
        const next = prev + GHOST_SPEEDS[difficulty];
        return next >= 100 ? next - 100 : next;
      });
    }, GHOST_TICK_MS[ghostPace]);

    return () => clearInterval(timer);
  }, [gameState, difficulty, ghostPace, GHOST_SPEEDS, GHOST_TICK_MS]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      const elapsedSeconds = (Date.now() - questionStartTime.current) / 1000;
      const remaining = Math.max(0, Math.ceil(QUESTION_TIME_LIMIT_SECONDS - elapsedSeconds));
      setQuestionTimeLeft(remaining);

      if (remaining === 0 && !questionTimeoutFired.current) {
        questionTimeoutFired.current = true;
        reportAnswerSubmitted(Date.now());
        setComboCount(0);
        awaitingNextQuestionRef.current = true;
        setFeedback('incorrect');
        setUserInput('');
        setQuestionHistory(prev => ([
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            question: currentQuestion,
            correctAnswer,
            userAnswer: '',
            points: 0,
            outcome: 'timeout',
          },
          ...prev,
        ]));
        setErrorCount(0);
        generateNewQuestion(false);
        setTimeout(() => setFeedback(null), 500);
      }
    }, 200);

    return () => clearInterval(timer);
  }, [gameState, generateNewQuestion, QUESTION_TIME_LIMIT_SECONDS, currentQuestion, correctAnswer, reportAnswerSubmitted]);

  // Add keyboard support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameState !== 'playing') return;

      if (event.key >= '0' && event.key <= '9') {
        handleKeyPress(event.key);
      } else if (event.key === 'Backspace') {
        handleDelete();
      } else if (event.key === 'Escape' || event.key.toLowerCase() === 'c') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, handleKeyPress, handleDelete, handleClear]);

  useEffect(() => {
    if (gameState === 'setup') {
      setProfile(getProfile());
      setNewUnlocks([]);
    }
  }, [gameState]);

  if (gameState === 'setup') {
    const unlockedCharacters = CHARACTERS.filter(c => profile.unlockedCharacters.includes(c.id));
    return (
      <div className="race-interface" style={{
        maxWidth: '1000px',
        margin: '2rem auto',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <h1 style={{ color: '#1e293b', marginBottom: '1.5rem', textAlign: 'left' }}>🏎️ Math Race!</h1>

        <div className="home-layout">
          <section className="home-left" aria-label="Homepage stats">
            <HomeDashboard apiBaseUrl={API_BASE_URL} totalPoints={profile.totalPoints} />
          </section>

          <section className="home-right" aria-label="Game selection">
            <div className="home-card" style={{ marginBottom: '16px' }}>
              <div style={{ color: '#64748b', fontWeight: 900, marginBottom: '10px' }}>Select Strand</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['number', 'measures', 'shape'] as Category[]).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className="home-button"
                    data-active={category === cat}
                    aria-pressed={category === cat}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                  >
                    {cat === 'number' ? '数 (Number)' : cat === 'measures' ? '度量 (Measures)' : '图形 (Shape)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="home-card" style={{ marginBottom: '16px' }}>
              <div style={{ color: '#64748b', fontWeight: 900, marginBottom: '10px' }}>Ghost Pace</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['slow', 'normal', 'fast'] as GhostPace[]).map(pace => (
                  <button
                    key={pace}
                    type="button"
                    onClick={() => setGhostPace(pace)}
                    className="home-button"
                    data-active={ghostPace === pace}
                    aria-pressed={ghostPace === pace}
                    style={{ flex: 1, textTransform: 'capitalize' }}
                  >
                    {pace}
                  </button>
                ))}
              </div>
            </div>

            <div className="home-card" style={{ marginBottom: '16px' }}>
              <div style={{ color: '#64748b', fontWeight: 900, marginBottom: '10px' }}>Select Difficulty</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => startGame(category, diff)}
                    className="home-button"
                    data-active={false}
                    style={{
                      textTransform: 'capitalize',
                      borderColor: diff === 'hard' ? 'rgba(139, 30, 63, 0.9)' : 'rgba(139, 30, 63, 0.28)',
                      backgroundColor: diff === 'easy' ? 'var(--seashell)' : diff === 'medium' ? 'var(--afternoon)' : 'var(--garnet)',
                      color: diff === 'hard' ? 'var(--seashell)' : diff === 'medium' ? 'var(--ink)' : 'var(--garnet)',
                    }}
                  >
                    {diff === 'easy' ? '简单 (Easy)' : diff === 'medium' ? '中等 (Medium)' : '困难 (Hard)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="home-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                <div style={{ color: '#64748b', fontWeight: 900 }}>已解锁角色</div>
                <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 800 }}>{unlockedCharacters.length} / {CHARACTERS.length}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {unlockedCharacters.map(char => (
                  <div key={char.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.6rem',
                    backgroundColor: profile.currentCharacter === char.id ? '#dbeafe' : '#ffffff',
                    border: `1px solid ${profile.currentCharacter === char.id ? '#93c5fd' : '#e2e8f0'}`,
                    borderRadius: '999px'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{char.icon}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{char.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (gameState === 'won' || gameState === 'lost' || gameState === 'ended') {
    return (
      <div className="race-interface" style={{
        maxWidth: '600px',
        margin: '2rem auto',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <ResultsScreen 
          gameState={gameState}
          sessionPoints={sessionPoints}
          profile={profile}
          newUnlocks={newUnlocks}
          aiFeedback={gameState === 'ended' ? (aiFeedback ?? undefined) : undefined}
          aiFeedbackLoading={gameState === 'ended' ? aiFeedbackLoading : undefined}
          onPlayAgain={gameState === 'ended' ? handleBackToHome : () => {
            setProfile(getProfile());
            setNewUnlocks([]);
            setGameState('setup');
          }}
        />
      </div>
    );
  }

  return (
    <div className="race-interface" style={{
      maxWidth: '1000px',
      margin: '2rem auto',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div className="race-layout">
        <section className="race-panel race-left" aria-label="Marks and questions">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <h2 style={{ color: '#0f172a', margin: 0, fontSize: '1.25rem' }}>Marks</h2>
            <div style={{ color: '#64748b', fontWeight: 700 }}>Score: {sessionPoints}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ color: '#0f172a', fontWeight: 800 }}>Current</div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline' }}>
              <div style={{ color: '#0f172a', fontWeight: 800 }}>Time: {questionTimeLeft}s</div>
              <div style={{ color: '#64748b', fontWeight: 800 }}>Level: {difficulty.toUpperCase()}</div>
            </div>
          </div>

          <div className="race-stack">
            <QuestionDisplay 
              question={currentQuestion} 
              answer={''} 
              showAnswer={false}
              feedback={feedback}
              errorCount={errorCount}
              operands={operands}
              explanation={explanation}
            />

            <RaceTrack 
              playerProgress={playerProgress} 
              ghostProgress={ghostProgress} 
              isSpeedingUp={isSpeedingUp}
              playerIcon={currentRacerIcon}
            />

            <ComboMeter comboCount={comboCount} threshold={5} />
          </div>

          <div style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
            Recent questions
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="marks-table" aria-label="Question marks table">
              <thead>
                <tr>
                  <th scope="col">Pts</th>
                  <th scope="col">Question</th>
                  <th scope="col">Your</th>
                  <th scope="col">Answer</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {questionHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: '#64748b', padding: '0.75rem 0' }}>No marks yet</td>
                  </tr>
                ) : (
                  questionHistory.slice(0, 12).map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, color: item.points > 0 ? '#166534' : '#991b1b' }}>{item.points}</td>
                      <td>{item.question}</td>
                      <td>{item.userAnswer || '-'}</td>
                      <td style={{ fontWeight: 700 }}>{item.correctAnswer}</td>
                      <td style={{ fontWeight: 700, color: item.outcome === 'correct' ? '#166534' : '#991b1b' }}>
                        {item.outcome === 'correct' ? 'Correct' : item.outcome === 'timeout' ? 'Timeout' : 'Wrong'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="race-panel race-right" aria-label="Answer area">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleBackToHome}
                aria-label="Back to home page"
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '999px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(15, 23, 42, 0.06)',
                  transition: 'transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                ← Home
              </button>
              <button
                type="button"
                onClick={handleEndGame}
                aria-label="End game"
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '999px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(15, 23, 42, 0.06)',
                  transition: 'transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                End (+{sessionPoints})
              </button>
              <div style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.25rem' }}>Answer</div>
            </div>
            <div style={{ color: '#64748b', fontWeight: 800, textTransform: 'capitalize' }}>{category}</div>
          </div>

          <div style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            {currentQuestion}
          </div>

          <input
            aria-label="Your answer"
            value={userInput}
            readOnly
            tabIndex={0}
            style={{
              width: '90%',
              fontSize: '2rem',
              fontWeight: 800,
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: `2px solid ${feedback === 'incorrect' ? '#fca5a5' : feedback === 'correct' ? '#86efac' : '#e2e8f0'}`,
              backgroundColor: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              boxShadow: feedback === 'incorrect'
                ? '0 0 0 4px rgba(239, 68, 68, 0.15)'
                : feedback === 'correct'
                  ? '0 0 0 4px rgba(34, 197, 94, 0.15)'
                  : '0 4px 10px rgba(15, 23, 42, 0.06)',
              marginBottom: '1rem'
            }}
          />

          <NumberPad onKeyPress={handleKeyPress} onClear={handleClear} onDelete={handleDelete} />
        </section>
      </div>
    </div>
  );
};

export default RaceInterface;
