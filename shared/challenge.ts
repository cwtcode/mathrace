export interface MathProblem {
  id: string;
  question: string;
  answer: number;
  level: number;
}

export interface UserState {
  level: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
}
