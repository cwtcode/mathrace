import type { MathProblem, UserState } from '../shared/challenge.js';
import { v4 as uuidv4 } from 'uuid';
import { OpenRouterService } from './OpenRouterService.js';

export class ChallengeEngine {
  private static readonly MAX_LEVEL = 3;
  private static readonly MIN_LEVEL = 1;

  public static async generateProblemAsync(level: number, category: string = 'number'): Promise<MathProblem> {
    const difficulty = level === 1 ? 'easy' : level === 2 ? 'medium' : 'hard';
    
    // Try to get from OpenRouter
    const aiQuestion = await OpenRouterService.generateQuestion(category, difficulty);
    
    if (aiQuestion) {
      return {
        id: uuidv4(),
        question: aiQuestion.question,
        answer: aiQuestion.answer,
        level,
        explanation: aiQuestion.explanation
      };
    }

    // Fallback to rule-based generation
    return this.generateProblem(level, category);
  }

  public static generateProblem(level: number, category: string = 'number'): MathProblem {
    const isAddition = Math.random() > 0.5;
    let a, b, answer, question;
    let maxNum = level === 1 ? 10 : level === 2 ? 20 : 100;

    if (category === 'number') {
      if (level === 1) {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
      } else if (level === 2) {
        a = Math.floor(Math.random() * 20) + 1;
        b = Math.floor(Math.random() * 20) + 1;
      } else {
        a = Math.floor(Math.random() * 90) + 10;
        b = Math.floor(Math.random() * 90) + 10;
      }

      if (isAddition) {
        answer = a + b;
        question = `${a} + ${b}`;
      } else {
        if (a < b) [a, b] = [b, a];
        answer = a - b;
        question = `${a} - ${b}`;
      }
    } else if (category === 'measures') {
      const units = ['kg', 'm', '$'];
      const unit = units[Math.floor(Math.random() * units.length)];
      a = Math.floor(Math.random() * maxNum / 2) + 1;
      b = Math.floor(Math.random() * maxNum / 2) + 1;
      answer = a + b;
      question = `${a}${unit} + ${b}${unit}`;
    } else {
      // Shape category fallback
      const shapes = [
        { name: 'Triangle', sides: 3 },
        { name: 'Square', sides: 4 },
        { name: 'Pentagon', sides: 5 }
      ];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      answer = shape.sides;
      question = `${shape.name} sides?`;
    }

    return {
      id: uuidv4(),
      question,
      answer,
      level,
    };
  }

  public static updateState(state: UserState, isCorrect: boolean): UserState {
    const newState = { ...state };

    if (isCorrect) {
      newState.consecutiveCorrect += 1;
      newState.consecutiveWrong = 0;

      if (newState.consecutiveCorrect >= 3) {
        if (newState.level < this.MAX_LEVEL) {
          newState.level += 1;
        }
        newState.consecutiveCorrect = 0;
      }
    } else {
      newState.consecutiveWrong += 1;
      newState.consecutiveCorrect = 0;

      if (newState.consecutiveWrong >= 2) {
        if (newState.level > this.MIN_LEVEL) {
          newState.level -= 1;
        }
        newState.consecutiveWrong = 0;
      }
    }

    return newState;
  }
}
