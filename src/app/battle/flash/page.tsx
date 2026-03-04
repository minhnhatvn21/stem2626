'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
    getSessions, subscribeToSession,
    subscribeToSessionAnswers, submitAnswer, updateSession,
    getPublishedQuestions, getUserById,
} from '@/lib/firestore';
import { Session } from '@/types/session';
import { Question } from '@/types/question';
import { Answer } from '@/types/answer';
import { Zap, Flag, ChevronRight, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { FlashMap } from '@/components/battle/FlashMap';

const LABELS = ['A', 'B', 'C', 'D'];

interface PlayerScore {
    userId: string;
    displayName: string;
    score: number;
    correctCount: number;
}

export default function FlashPage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();
    const [view, setView] = useState<'lobby' | 'waiting' | 'battle' | 'ended'>('lobby');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [questionWinner, setQuestionWinner] = useState<string | null>(null);
    const [scores, setScores] = useState<PlayerScore[]>([]);
    const [timeLeft, setTimeLeft] = useState(15);
    const [flash, setFlash] = useState(false);

    const [penaltyUntil, setPenaltyUntil] = useState<number | null>(null);
    const [penaltyRemaining, setPenaltyRemaining] = useState<number>(0);

    const [timeUntilStart, setTimeUntilStart] = useState<string>('');

    // User profiles for display names
    const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!loading && !appUser) router.push('/auth/login');
    }, [appUser, loading, router]);

    useEffect(() => {
        getSessions().then(all => setSessions(all.filter(s => s.moduleType === 'flash' && (s.status === 'live' || s.status === 'scheduled'))));
    }, []);

    const joinSession = async (session: Session) => {
        setCurrentSession(session);
        const qList: Question[] = [];
        for (const qid of session.questionIds) {
            const qs = await getPublishedQuestions();
            const q = qs.find(q => q.id === qid);
            if (q) qList.push(q);
        }
        setQuestions(qList);
        setView(session.status === 'live' ? 'battle' : 'waiting');

        subscribeToSession(session.id, s => {
            if (s) {
                setCurrentSession(s);
                setSelectedAnswer(null);
                setHasAnswered(false);
                setQuestionWinner(null);
                if (s.currentQuestionIndex !== session.currentQuestionIndex) setFlash(true);
                if (s.status === 'live') setView('battle');
                if (s.status === 'ended') setView('ended');
            }
        });

        subscribeToSessionAnswers(session.id, allAnswers => {
            setAnswers(allAnswers);
            // Compute per-question winners
            const currentQ = qList[session.currentQuestionIndex];
            if (currentQ) {
                const correctAnswers = allAnswers.filter(a => a.questionId === currentQ.id && a.isCorrect);
                if (correctAnswers.length > 0) {
                    const first = correctAnswers.sort((a, b) => {
                        const ta = a.submittedAt instanceof Date ? a.submittedAt.getTime() : 0;
                        const tb = b.submittedAt instanceof Date ? b.submittedAt.getTime() : 0;
                        return ta - tb;
                    })[0];
                    setQuestionWinner(first.userId);
                }
            }

            // Build scoreboard
            const scoreMap: Record<string, PlayerScore> = {};
            allAnswers.forEach(a => {
                if (!scoreMap[a.userId]) {
                    scoreMap[a.userId] = { userId: a.userId, displayName: a.userId, score: 0, correctCount: 0 };
                }
                if (a.isCorrect) {
                    scoreMap[a.userId].score += 100;
                    scoreMap[a.userId].correctCount += 1;
                }
            });
            setScores(Object.values(scoreMap).sort((a, b) => b.score - a.score));
        });
    };

    const submitFlashAnswer = async (answerIndex: number) => {
        if (!currentSession || !appUser || hasAnswered || (penaltyUntil && Date.now() < penaltyUntil)) return;

        const currentQ = questions[currentSession.currentQuestionIndex];
        if (!currentQ) return;

        setSelectedAnswer(answerIndex);
        setHasAnswered(true);
        const isCorrect = answerIndex === currentQ.correctIndex;

        try {
            await submitAnswer({
                sessionId: currentSession.id,
                questionId: currentQ.id,
                moduleType: 'flash',
                userId: appUser.uid,
                answerIndex,
                isCorrect,
            });

            if (isCorrect) {
                toast('⚡ Chính xác! Đợi qua câu sau...', {
                    style: { background: '#22c55e20', border: '1px solid #22c55e', color: '#fff' }
                });
            } else {
                toast('✗ Sai rồi! Bị choáng 5 giây.', {
                    style: { background: '#ff2a2a20', border: '1px solid #ff2a2a', color: '#fff' }
                });
                setPenaltyUntil(Date.now() + 5000);
            }
        } catch (e) {
            toast.error('Lỗi gửi đáp án');
        }
    };

    useEffect(() => {
        if (flash) { setTimeout(() => setFlash(false), 500); }
    }, [flash]);

    // Penalty countdown effect
    useEffect(() => {
        if (!penaltyUntil) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, penaltyUntil - Date.now());
            setPenaltyRemaining(remaining);
            if (remaining === 0) {
                setPenaltyUntil(null);
                setHasAnswered(false);
                setSelectedAnswer(null);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [penaltyUntil]);

    // Fetch display names
    useEffect(() => {
        scores.forEach(s => {
            if (!userProfiles[s.userId] && s.userId) {
                getUserById(s.userId).then(u => {
                    if (u?.displayName) {
                        setUserProfiles(prev => ({ ...prev, [s.userId]: u.displayName }));
                    }
                });
            }
        });
    }, [scores]);

    // Format start time
    const formatStartTime = (dateInput: any) => {
        if (!dateInput) return '';
        const d = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    // Scheduled countdown effect
    useEffect(() => {
        if (view === 'waiting' && currentSession?.scheduledStartAt) {
            const interval = setInterval(() => {
                const s = currentSession.scheduledStartAt as any;
                const d = s.toDate ? s.toDate() : new Date(s);
                const diff = d.getTime() - Date.now();
                if (diff > 0) {
                    const m = Math.floor(diff / 60000);
                    const sec = Math.floor((diff % 60000) / 1000);
                    setTimeUntilStart(`Mở sau ${m}:${sec.toString().padStart(2, '0')}`);
                } else {
                    setTimeUntilStart('Đang chờ Admin khai hỏa...');
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [view, currentSession]);

    if (loading || !appUser) {
        return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-16 h-16 border-4 border-[#ffc400] border-t-transparent rounded-full animate-spin" /></div>;
    }

    const currentQ = currentSession ? questions[currentSession.currentQuestionIndex] : null;

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
            <FireBackgroundCanvas />
            <NavHeader />

            {flash && (
                <motion.div
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 bg-[#ffc400]/20 z-40 pointer-events-none"
                />
            )}

            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-12">
                <AnimatePresence mode="wait">
                    {/* LOBBY */}
                    {view === 'lobby' && (
                        <motion.div key="lobby" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-2xl pt-8">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#ffc400]/20 border border-[#ffc400]/40 mb-4" style={{ boxShadow: '0 0 30px rgba(255,196,0,0.4)', animation: 'pulse-fire 2s ease-in-out infinite' }}>
                                    <Zap size={40} className="text-[#ffc400]" />
                                </div>
                                <h1 className="font-orbitron font-black text-4xl text-white mb-2">NHANH NHƯ CHỚP</h1>
                                <p className="text-[#9a9a9a]">Ai nhanh và đúng nhất giành điểm cao nhất ⚡</p>
                            </div>

                            <div className="fire-card p-6">
                                <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                                    <Zap size={18} className="text-[#ffc400]" /> Phiên Thi Đang Mở
                                </h3>
                                {sessions.length === 0 ? (
                                    <div className="text-center py-8 text-[#9a9a9a]">
                                        <Zap size={40} className="mx-auto mb-3 opacity-40 text-[#ffc400]" />
                                        <p>Chưa có phiên thi nào đang mở</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sessions.map(s => (
                                            <motion.div
                                                key={s.id}
                                                whileHover={{ x: 4 }}
                                                className="flex items-center justify-between p-4 rounded-xl border border-[#ffc400]/30 bg-[#ffc400]/5 cursor-pointer"
                                                onClick={() => joinSession(s)}
                                            >
                                                <div>
                                                    <div className="font-orbitron font-bold text-white">{s.title}</div>
                                                    <div className="text-[#9a9a9a] text-sm flex items-center gap-1">
                                                        {s.questionIds.length} câu • {s.questionDurationSec}s/câu
                                                        {s.scheduledStartAt && ` • 🕒 ${formatStartTime(s.scheduledStartAt)}`}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={s.status === 'live' ? 'live' : 'draft'}>{s.status === 'live' ? 'ĐANG MỞ' : 'SẮP MỞ'}</Badge>
                                                    <ChevronRight size={16} className="text-[#ffc400]" />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* WAITING */}
                    {view === 'waiting' && (
                        <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-12 w-full max-w-md">
                            <Zap size={64} className="mx-auto text-[#ffc400] mb-4 animate-pulse" />
                            <h2 className="font-orbitron font-bold text-2xl text-white mb-2">PHÒNG CHỜ</h2>
                            <p className="text-[#ff7a00] text-lg font-bold">{timeUntilStart || 'Đợi admin khai hỏa...'}</p>
                            {currentSession?.scheduledStartAt && (
                                <p className="text-[#9a9a9a] mt-2 text-sm">Giờ mở dự kiến: {formatStartTime(currentSession.scheduledStartAt)}</p>
                            )}
                            <div className="mt-6 p-4 fire-card">
                                <p className="text-[#9a9a9a] text-sm">Tham gia: {answers.length} người</p>
                            </div>
                        </motion.div>
                    )}

                    {/* BATTLE */}
                    {view === 'battle' && currentSession && (
                        <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-6xl pt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                {/* Main Question Area */}
                                <div className="lg:col-span-3 space-y-4">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="font-orbitron text-[#9a9a9a] text-sm">
                                            Câu {currentSession.currentQuestionIndex + 1} / {questions.length}
                                        </div>
                                        <div className="font-orbitron font-bold text-2xl text-[#ffc400]">
                                            ⚡ NHANH LÊN!
                                        </div>
                                    </div>

                                    {/* Question Card */}
                                    {currentQ ? (
                                        <>
                                            <motion.div
                                                key={currentQ.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="fire-card p-6"
                                                style={{ boxShadow: '0 0 30px rgba(255,196,0,0.2)' }}
                                            >
                                                <p className="text-white text-xl font-medium leading-relaxed">{currentQ.question}</p>
                                            </motion.div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                                                {/* Penalty Overlay */}
                                                <AnimatePresence>
                                                    {penaltyUntil && penaltyRemaining > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl border border-[#ff2a2a]/50"
                                                        >
                                                            <Clock size={48} className="text-[#ff2a2a] mb-2 animate-pulse" />
                                                            <div className="font-orbitron font-black text-4xl text-[#ff2a2a]">
                                                                {(penaltyRemaining / 1000).toFixed(1)}s
                                                            </div>
                                                            <div className="text-white text-sm font-bold uppercase mt-1">Bị Choáng</div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {currentQ.options.map((opt, i) => (
                                                    <motion.button
                                                        key={i}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        whileHover={!hasAnswered && !penaltyUntil ? { scale: 1.02 } : {}}
                                                        whileTap={!hasAnswered && !penaltyUntil ? { scale: 0.98 } : {}}
                                                        className={`answer-option text-sm ${selectedAnswer === i ? (i === currentQ.correctIndex ? 'correct' : 'wrong') : ''}`}
                                                        onClick={() => submitFlashAnswer(i)}
                                                        disabled={hasAnswered || !!penaltyUntil}
                                                    >
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#ffc400]/20 text-[#ffc400] font-bold text-sm mr-3 flex-shrink-0">
                                                            {LABELS[i]}
                                                        </span>
                                                        {opt}
                                                    </motion.button>
                                                ))}
                                            </div>

                                            {/* Winner announcement */}
                                            <AnimatePresence>
                                                {questionWinner && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="p-4 rounded-xl border border-[#ffc400]/40 bg-[#ffc400]/10 text-center"
                                                    >
                                                        <div className="font-orbitron font-bold text-[#ffc400]">
                                                            ⚡ {questionWinner === appUser?.uid ? 'BẠN THẮNG CÂU NÀY!' : `${questionWinner} thắng câu này!`}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {hasAnswered && !questionWinner && (
                                                <p className="text-center text-[#9a9a9a] text-sm">Đã gửi • Đợi người chơi khác...</p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="fire-card p-8 text-center">
                                            <Zap size={40} className="mx-auto text-[#ffc400] mb-3 animate-pulse" />
                                            <p className="text-[#9a9a9a]">Đợi câu hỏi tiếp theo...</p>
                                        </div>
                                    )}
                                </div>

                                {/* Interactive Map */}
                                <div className="lg:col-span-2">
                                    <div className="sticky top-24">
                                        <FlashMap players={scores.map(s => ({ ...s, displayName: userProfiles[s.userId] || s.displayName }))} myUserId={appUser?.uid} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ENDED */}
                    {view === 'ended' && (
                        <motion.div key="ended" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl pt-12 text-center">
                            <Zap size={64} className="mx-auto text-[#ffc400] mb-4" />
                            <h2 className="font-orbitron font-black text-4xl fire-gradient-text mb-4">PHIÊN KẾT THÚC!</h2>
                            {scores[0] && (
                                <div className="fire-card p-6 mb-6" style={{ boxShadow: '0 0 40px rgba(255,196,0,0.3)' }}>
                                    <p className="text-[#9a9a9a] mb-1">⚡ NHANH NHẤT</p>
                                    <div className="font-orbitron font-black text-3xl text-white">{userProfiles[scores[0].userId] || scores[0].displayName}</div>
                                    <div className="text-[#ffc400] mt-1">{scores[0].score} điểm • {scores[0].correctCount} câu đúng</div>
                                </div>
                            )}
                            <div className="fire-card p-5 mb-6">
                                <h4 className="font-orbitron font-bold text-white mb-3">KẾT QUẢ CUỐI CÙNG</h4>
                                {scores.slice(0, 5).map((s, i) => (
                                    <div key={s.userId} className={`scoreboard-row mb-2 ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''}`}>
                                        <div className="w-7 text-center font-orbitron font-bold">{i + 1}</div>
                                        <div className="flex-1 ml-3 text-white text-left">{userProfiles[s.userId] || s.displayName}</div>
                                        <div className="font-orbitron text-[#ffc400] font-bold">{s.score}</div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="fire" onClick={() => { setView('lobby'); setCurrentSession(null); }}>
                                Quay Về Lobby
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
