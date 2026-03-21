import { v4 as uuidv4 } from 'uuid';
export class ChallengeEngine {
    static MAX_LEVEL = 2;
    static MIN_LEVEL = 1;
    static generateProblem(level) {
        const isAddition = Math.random() > 0.5;
        let a, b, answer;
        if (level === 1) {
            // Single digits
            a = Math.floor(Math.random() * 10);
            b = Math.floor(Math.random() * 10);
        }
        else {
            // Double digits
            a = Math.floor(Math.random() * 90) + 10;
            b = Math.floor(Math.random() * 90) + 10;
        }
        if (isAddition) {
            answer = a + b;
        }
        else {
            // For subtraction, ensure result is non-negative for simplicity
            if (a < b)
                [a, b] = [b, a];
            answer = a - b;
        }
        return {
            id: uuidv4(),
            question: `${a} ${isAddition ? '+' : '-'} ${b}`,
            answer,
            level,
        };
    }
    static updateState(state, isCorrect) {
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
        }
        else {
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
//# sourceMappingURL=ChallengeEngine.js.map