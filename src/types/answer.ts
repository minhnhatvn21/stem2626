// Answer types
export interface Answer {
    id: string;
    sessionId: string;
    questionId: string;
    moduleType: string;
    userId: string;
    teamId?: string;
    answerIndex: number;
    isCorrect: boolean;
    submittedAt: Date;
    responseTimeMs?: number;
}

export interface PracticeAttempt {
    id: string;
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
    timeSpentMs: number;
    difficulty?: string;
    createdAt: Date;
}

export interface ScoreboardEntry {
    userId: string;
    displayName: string;
    teamId?: string;
    teamName?: string;
    score: number;
    correctCount: number;
    rank: number;
}

export interface Result {
    id: string;
    sessionId: string;
    moduleType: string;
    scoreboard: ScoreboardEntry[];
    winners: ScoreboardEntry[];
    createdAt: Date;
}
