// Question types
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ModuleType = 'warrior' | 'team-battle' | 'flash';
export type QuestionStatus = 'draft' | 'published';
export type QuestionSource = 'ai' | 'admin';
export type QuestionType = 'multiple-choice' | 'drag-drop';

export interface Question {
    id: string;
    moduleType: ModuleType | 'all';
    topic: string;
    difficulty: Difficulty;
    type?: QuestionType; // Optional for backward compatibility, defaults to multiple-choice
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    source: QuestionSource;
    status: QuestionStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AIQuestionRequest {
    topic: string;
    difficulty: Difficulty;
    count: number;
    gradeLevel?: string;
    type?: QuestionType;
}

export interface AIGeneratedQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    difficulty: Difficulty;
    topic: string;
    type?: QuestionType;
}
