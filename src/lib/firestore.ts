import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    addDoc,
    writeBatch,
    runTransaction,
    Timestamp,
    QueryConstraint,
    DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { AppUser } from '@/types/user';
import { Question } from '@/types/question';
import { Session, Team } from '@/types/session';
import { Answer, PracticeAttempt } from '@/types/answer';
import { DuelRoom, DuelAnswer } from '@/types/duel';

// ============ USER ============
export async function getUserById(uid: string): Promise<AppUser | null> {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        ...data,
        uid: snap.id,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
    } as AppUser;
}

export async function createUser(user: Omit<AppUser, 'createdAt'>) {
    await setDoc(doc(db, 'users', user.uid), {
        ...user,
        createdAt: serverTimestamp(),
        totalPoints: 0,
    });
}

export async function updateUser(uid: string, data: Partial<AppUser>) {
    await updateDoc(doc(db, 'users', uid), data as DocumentData);
}

export function subscribeToUser(uid: string, cb: (user: AppUser | null) => void) {
    return onSnapshot(doc(db, 'users', uid), (snap) => {
        if (!snap.exists()) { cb(null); return; }
        const data = snap.data();
        cb({ ...data, uid: snap.id, createdAt: data.createdAt?.toDate?.() ?? new Date() } as AppUser);
    }, (error) => {
        console.error("subscribeToUser error", error);
        cb(null);
    });
}

// ============ QUESTIONS ============
export async function getPublishedQuestions(moduleTypes?: string[]): Promise<Question[]> {
    const constraints: QueryConstraint[] = [where('status', '==', 'published')];
    if (moduleTypes && moduleTypes.length > 0) {
        constraints.push(where('moduleType', 'in', moduleTypes));
    }
    // Note: no orderBy to avoid composite index requirement — sorted client-side
    const q = query(collection(db, 'questions'), ...constraints);
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() ?? new Date(), updatedAt: d.data().updatedAt?.toDate?.() ?? new Date() } as Question));
    // Sort by createdAt descending client-side
    return docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getAllQuestions(): Promise<Question[]> {
    const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() ?? new Date(), updatedAt: d.data().updatedAt?.toDate?.() ?? new Date() } as Question));
}

export async function addQuestion(q: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) {
    return addDoc(collection(db, 'questions'), { ...q, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function updateQuestion(id: string, data: Partial<Question>) {
    await updateDoc(doc(db, 'questions', id), { ...data as DocumentData, updatedAt: serverTimestamp() });
}

export async function deleteQuestion(id: string) {
    await deleteDoc(doc(db, 'questions', id));
}

// ============ TEAMS ============
export async function getTeams(): Promise<Team[]> {
    const snap = await getDocs(collection(db, 'teams'));
    return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() ?? new Date() } as Team));
}

export async function createTeam(team: Omit<Team, 'id' | 'createdAt'>) {
    return addDoc(collection(db, 'teams'), { ...team, createdAt: serverTimestamp() });
}

export async function updateTeam(id: string, data: Partial<Team>) {
    await updateDoc(doc(db, 'teams', id), data as DocumentData);
}

export async function deleteTeam(id: string) {
    await deleteDoc(doc(db, 'teams', id));
}

// ============ SESSIONS ============
export async function getSessions(): Promise<Session[]> {
    const q = query(collection(db, 'sessions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
        id: d.id, ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        startAt: d.data().startAt?.toDate?.() ?? null,
    } as Session));
}

export async function getSessionById(id: string): Promise<Session | null> {
    const snap = await getDoc(doc(db, 'sessions', id));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { id: snap.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date(), startAt: data.startAt?.toDate?.() ?? null } as Session;
}

export async function createSession(s: Omit<Session, 'id' | 'createdAt'>) {
    return addDoc(collection(db, 'sessions'), { ...s, createdAt: serverTimestamp() });
}

export async function updateSession(id: string, data: Partial<Session>) {
    await updateDoc(doc(db, 'sessions', id), data as DocumentData);
}

export async function deleteSession(id: string) {
    await deleteDoc(doc(db, 'sessions', id));
}

export function subscribeToSession(id: string, cb: (s: Session | null) => void) {
    return onSnapshot(doc(db, 'sessions', id), (snap) => {
        if (!snap.exists()) { cb(null); return; }
        const data = snap.data();
        cb({ id: snap.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date(), startAt: data.startAt?.toDate?.() ?? null } as Session);
    });
}

// ============ ANSWERS ============
export async function submitAnswer(answer: Omit<Answer, 'id' | 'submittedAt'>) {
    return addDoc(collection(db, 'answers'), { ...answer, submittedAt: serverTimestamp() });
}

export async function getAnswersForSession(sessionId: string): Promise<Answer[]> {
    const q = query(collection(db, 'answers'), where('sessionId', '==', sessionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
        id: d.id, ...d.data(),
        submittedAt: d.data().submittedAt?.toDate?.() ?? new Date(),
    } as Answer));
}

export function subscribeToAnswers(sessionId: string, questionId: string, cb: (answers: Answer[]) => void) {
    const q = query(
        collection(db, 'answers'),
        where('sessionId', '==', sessionId),
        where('questionId', '==', questionId)
    );
    return onSnapshot(q, (snap) => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data(), submittedAt: d.data().submittedAt?.toDate?.() ?? new Date() } as Answer)));
    });
}

// ============ PRACTICE ============
export async function savePracticeAttempt(uid: string, attempt: Omit<PracticeAttempt, 'id' | 'createdAt'>) {
    return addDoc(collection(db, 'practiceAttempts', uid, 'attempts'), { ...attempt, createdAt: serverTimestamp() });
}

export async function getPracticeAttempts(uid: string): Promise<PracticeAttempt[]> {
    // No orderBy to avoid composite index requirement — sort client-side
    const q = query(collection(db, 'practiceAttempts', uid, 'attempts'), limit(50));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() ?? new Date() } as PracticeAttempt));
    return docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ============ DAILY PRACTICE LIMIT ============
// Returns true if user can practice today (hasn't practiced yet today)
export async function checkDailyPracticeLimit(uid: string, difficulty: string): Promise<{ canPlay: boolean; nextReset: Date }> {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const snap = await getDoc(doc(db, 'users', uid));
    const userData = snap.data();
    const lastDate: Record<string, string> = userData?.lastPracticeDate ?? {};
    const canPlay = lastDate[difficulty] !== today;
    // next reset = midnight Vietnam time (UTC+7)
    const nextReset = new Date();
    nextReset.setHours(24, 0, 0, 0); // midnight local
    return { canPlay, nextReset };
}

export async function markDailyPracticeUsed(uid: string, difficulty: string) {
    const today = new Date().toISOString().split('T')[0];
    await updateDoc(doc(db, 'users', uid), {
        [`lastPracticeDate.${difficulty}`]: today,
    });
}

// ============ REALTIME MAP ============
export function subscribeToSessionAnswers(sessionId: string, cb: (answers: Answer[]) => void) {
    const q = query(collection(db, 'answers'), where('sessionId', '==', sessionId));
    return onSnapshot(q, (snap) => {
        cb(snap.docs.map(d => ({ id: d.id, ...d.data(), submittedAt: d.data().submittedAt?.toDate?.() ?? new Date() } as Answer)));
    });
}

export async function getLeaderboard(limitCount = 10): Promise<AppUser[]> {
    // Note: Avoid composite index requirement by sorting client-side
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const snap = await getDocs(q);
    const users = snap.docs.map(d => ({ uid: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() ?? new Date() } as AppUser));
    return users.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, limitCount);
}

// ============ DUELS (THÁCH ĐẤU) ============
export async function createDuelRoom(room: Omit<DuelRoom, 'createdAt' | 'updatedAt' | 'startedAt'>) {
    // room.id is the 6-character code
    await setDoc(doc(db, 'duels', room.id), {
        ...room,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startedAt: null,
    });
}

export async function getDuelRoom(roomId: string): Promise<DuelRoom | null> {
    const snap = await getDoc(doc(db, 'duels', roomId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        ...data,
        id: snap.id,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        startedAt: data.startedAt?.toDate?.() ?? null,
    } as DuelRoom;
}

export async function updateDuelRoom(roomId: string, data: Partial<DuelRoom>) {
    await updateDoc(doc(db, 'duels', roomId), {
        ...data,
        updatedAt: serverTimestamp(),
    } as DocumentData);
}

export function subscribeToDuelRoom(roomId: string, cb: (room: DuelRoom | null) => void) {
    return onSnapshot(doc(db, 'duels', roomId), (snap) => {
        if (!snap.exists()) {
            cb(null);
            return;
        }
        const data = snap.data();
        cb({
            ...data,
            id: snap.id,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
            startedAt: data.startedAt?.toDate?.() ?? null,
        } as DuelRoom);
    });
}

export async function submitDuelAnswer(answer: DuelAnswer) {
    return addDoc(collection(db, 'duels', answer.roomId, 'answers'), {
        ...answer,
        submittedAt: serverTimestamp()
    });
}

export function subscribeToDuelAnswers(roomId: string, cb: (answers: DuelAnswer[]) => void) {
    const q = query(collection(db, 'duels', roomId, 'answers'));
    return onSnapshot(q, (snap) => {
        cb(snap.docs.map(d => ({
            id: d.id, ...d.data(),
            submittedAt: d.data().submittedAt?.toDate?.() ?? new Date()
        } as DuelAnswer)));
    });
}

// Export Timestamp for use elsewhere
export { serverTimestamp, Timestamp, runTransaction, writeBatch, doc, collection, db };
