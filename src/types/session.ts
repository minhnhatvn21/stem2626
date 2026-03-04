// Session types
export type SessionStatus = 'draft' | 'scheduled' | 'live' | 'ended';
export type SessionModuleType = 'team-battle' | 'flash';

export interface Session {
    id: string;
    moduleType: SessionModuleType;
    title: string;
    status: SessionStatus;
    code: string;
    questionIds: string[];
    teamIds: string[];
    startAt: Date | null;
    scheduledStartAt?: Date | null;
    isAutoAdvance?: boolean;
    questionDurationSec: number;
    intervalSec: number;
    currentQuestionIndex: number;
    lastAdvancedAt?: Date | null;
    createdBy: string;
    createdAt: Date;
}

export interface SessionQuestion {
    id: string;
    sessionId: string;
    questionIndex: number;
    questionId: string;
    openedAt: Date | null;
    closedAt: Date | null;
    winnerUserId?: string;
    winnerTeamId?: string;
    resolvedAt?: Date;
}

export interface Team {
    id: string;
    name: string;
    code: string;
    memberIds: string[];
    color: string;
    score?: number;
    createdAt: Date;
}

export interface MapCell {
    index: number;
    teamId: string | null;
    teamColor: string | null;
    teamName: string | null;
    conqueredAt?: Date;
}
