export type DuelStatus = 'waiting' | 'playing' | 'ended';

export interface DuelRoom {
    id: string; // The 6-character room code
    status: DuelStatus;
    hostId: string;
    guestId: string | null;
    hostScore: number;
    guestScore: number;
    questions: any[]; // Store AI generated questions directly
    currentQuestionIndex: number;
    difficulty: string;
    createdAt: Date;
    startedAt: Date | null;
    updatedAt: Date;
}

export interface DuelAnswer {
    id?: string;
    roomId: string;
    questionId: string;
    userId: string;
    answerIndex: number;
    isCorrect: boolean;
    timeSpentMs: number;
    submittedAt: Date;
}
