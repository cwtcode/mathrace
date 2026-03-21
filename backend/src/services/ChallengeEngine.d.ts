import type { MathProblem, UserState } from '../../../shared/challenge.js';
export declare class ChallengeEngine {
    private static readonly MAX_LEVEL;
    private static readonly MIN_LEVEL;
    static generateProblem(level: number): MathProblem;
    static updateState(state: UserState, isCorrect: boolean): UserState;
}
//# sourceMappingURL=ChallengeEngine.d.ts.map