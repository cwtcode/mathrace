import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';

export interface GeneratedQuestion {
  question: string;
  answer: number;
  explanation?: string;
}

export class OpenRouterService {
  private static parseJsonObject(content: string) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    return JSON.parse(jsonStr);
  }

  private static normalizeGeneratedQuestion(parsed: any): GeneratedQuestion | null {
    const question = typeof parsed?.question === 'string' ? parsed.question.trim() : '';
    const answerNum = Number(parsed?.answer);
    const explanation = typeof parsed?.explanation === 'string' ? parsed.explanation.trim() : undefined;

    if (!question) return null;
    if (!Number.isFinite(answerNum)) return null;
    return { question, answer: answerNum, explanation };
  }

  public static async generateQuestion(
    category: string,
    difficulty: string,
    model: string = DEFAULT_MODEL
  ): Promise<GeneratedQuestion | null> {
    if (!OPENROUTER_API_KEY) {
      console.warn('OPENROUTER_API_KEY is not set. Falling back to rule-based generation.');
      return null;
    }

    const prompt = `
      Generate a primary school math question for a ${difficulty} level in the category of "${category}".
      The question should be suitable for children aged 6-9.
      Return the response in JSON format with the following keys:
      - question: the question text (e.g., "7 + 5")
      - answer: the numerical answer (e.g., 12)
      - explanation: a short visual hint or explanation for children (e.g., "Think of 7 apples and 5 more apples!")
      
      Only return the JSON object, nothing else.
    `;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 150,
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://math-racers.example.com', // Optional
            'X-Title': 'Math Racers', // Optional
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenRouter');

      const parsed = this.parseJsonObject(String(content));
      return this.normalizeGeneratedQuestion(parsed);
    } catch (error: any) {
      if (error.response) {
        console.error(`OpenRouter API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(`OpenRouter Integration Error: ${error.message}`);
      }
      return null;
    }
  }

  public static async generateSessionFeedback(
    summary: {
      sessionPoints: number;
      totalAnswered: number;
      correct: number;
      wrong: number;
      timeout: number;
      maxCombo: number;
      category?: string;
      difficulty?: string;
      ghostPace?: string;
    },
    model: string = DEFAULT_MODEL
  ): Promise<string | null> {
    if (!OPENROUTER_API_KEY) {
      return null;
    }

    const prompt = `
      You are a friendly primary-school math coach. Write short, encouraging feedback based on the player's results.
      Keep it 3-5 sentences. Mention one strength and one concrete improvement tip.
      Avoid shaming. Use simple words. Do not include any markdown.

      Results:
      - sessionPoints: ${summary.sessionPoints}
      - totalAnswered: ${summary.totalAnswered}
      - correct: ${summary.correct}
      - wrong: ${summary.wrong}
      - timeout: ${summary.timeout}
      - maxCombo: ${summary.maxCombo}
      - category: ${summary.category ?? 'unknown'}
      - difficulty: ${summary.difficulty ?? 'unknown'}
      - ghostPace: ${summary.ghostPace ?? 'unknown'}

      Return ONLY a JSON object with:
      - feedback: string
    `;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 220,
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://math-racers.example.com',
            'X-Title': 'Math Racers',
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenRouter');

      const parsed = this.parseJsonObject(String(content));
      const feedback = String(parsed.feedback ?? '').trim();
      return feedback ? feedback : null;
    } catch (error: any) {
      if (error.response) {
        console.error(`OpenRouter API Error: ${error.response.status}`);
      } else {
        console.error(`OpenRouter Integration Error: ${error.message}`);
      }
      return null;
    }
  }

  public static async generateAnalyticsFeedback(
    summary: {
      totalAnswered: number;
      totalCorrect: number;
      accuracy: number;
      breakdownByType: Array<{ questionType: string; totalAnswered: number; correct: number }>;
      seriesDaily: Array<{ label: string; totalAnswered: number; correct: number }>;
      category?: string;
      questionType?: string;
      fromMs?: number;
      toMs?: number;
    },
    model: string = DEFAULT_MODEL
  ): Promise<string | null> {
    if (!OPENROUTER_API_KEY) return null;

    const prompt = `
      You are an analytics coach for a learning game. Analyze the user's performance patterns and give personalized recommendations.
      Keep it 5-8 short sentences. Mention:
      1) One strength
      2) One weakness or risk pattern
      3) Two concrete practice tips
      4) One small goal for next session
      Use simple, encouraging language. No markdown.

      Filters:
      - category: ${summary.category ?? 'all'}
      - questionType: ${summary.questionType ?? 'all'}
      - fromMs: ${summary.fromMs ?? 'none'}
      - toMs: ${summary.toMs ?? 'none'}

      Totals:
      - totalAnswered: ${summary.totalAnswered}
      - totalCorrect: ${summary.totalCorrect}
      - accuracy: ${Math.round(summary.accuracy * 100)}%

      Breakdown by question type (type, answered, correct):
      ${summary.breakdownByType.map((r) => `- ${r.questionType}: ${r.totalAnswered}, ${r.correct}`).join('\n')}

      Daily trend (label, answered, correct):
      ${summary.seriesDaily.map((p) => `- ${p.label}: ${p.totalAnswered}, ${p.correct}`).join('\n')}

      Return ONLY a JSON object with:
      - feedback: string
    `;

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 360,
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://math-racers.example.com',
            'X-Title': 'Math Racers',
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenRouter');

      const parsed = this.parseJsonObject(String(content));
      const feedback = String(parsed.feedback ?? '').trim();
      return feedback ? feedback : null;
    } catch (error: any) {
      if (error.response) {
        console.error(`OpenRouter API Error: ${error.response.status}`);
      } else {
        console.error(`OpenRouter Integration Error: ${error.message}`);
      }
      return null;
    }
  }
}
