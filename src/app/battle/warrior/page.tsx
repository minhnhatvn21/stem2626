'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { savePracticeAttempt, updateUser, checkDailyPracticeLimit, markDailyPracticeUsed } from '@/lib/firestore';
import { Difficulty } from '@/types/question';
import { Shield, Zap, Star, RotateCcw, CheckCircle, XCircle, ChevronRight, Flame, Loader2, Lock, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

type GameState = 'menu' | 'loading' | 'playing' | 'result';
type AIQuestion = {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    topic: string;
    difficulty: string;
};

const LABELS = ['A', 'B', 'C', 'D'];

const DIFF_CONFIG = {
    easy: { label: 'DỄ - Chiến Binh Mới', desc: 'Tối đa 200 điểm/câu do AI tạo', color: '#22c55e', emoji: '🟢' },
    medium: { label: 'VỪA - Chiến Binh Dũng Cảm', desc: 'Tối đa 400 điểm/câu do AI tạo', color: '#ffc400', emoji: '🟡' },
    hard: { label: 'KHÓ - Huyền Thoại', desc: 'Tối đa 600 điểm/câu do AI tạo', color: '#ff2a2a', emoji: '🔴' },
};

export default function WarriorPage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();

    const [gameState, setGameState] = useState<GameState>('menu');
    const [questions, setQuestions] = useState<AIQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(20);
    const [difficulty, setDifficulty] = useState<Difficulty>('easy');
    const [questionResult, setQuestionResult] = useState<'correct' | 'wrong' | null>(null);

    // Daily limit state: per difficulty
    const [dailyStatus, setDailyStatus] = useState<Record<string, { canPlay: boolean; nextReset: Date }>>({});
    const [loadingLimit, setLoadingLimit] = useState(true);

    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval>>();

    useEffect(() => {
        if (!loading && !appUser) router.push('/auth/login');
    }, [appUser, loading, router]);

    // Load daily limits for all difficulties on mount
    useEffect(() => {
        if (!appUser) return;
        const loadLimits = async () => {
            setLoadingLimit(true);
            try {
                const [easy, medium, hard] = await Promise.all([
                    checkDailyPracticeLimit(appUser.uid, 'easy'),
                    checkDailyPracticeLimit(appUser.uid, 'medium'),
                    checkDailyPracticeLimit(appUser.uid, 'hard'),
                ]);
                setDailyStatus({ easy, medium, hard });
            } catch { /* Firestore not configured yet - allow all */ }
            setLoadingLimit(false);
        };
        loadLimits();
    }, [appUser]);

    const handleTimeout = useCallback(() => {
        clearInterval(timerRef.current);
        setShowResult(true);
        setQuestionResult('wrong');
        setTimeout(() => nextQuestion(), 2500);
    }, []);  // nextQuestion defined below with useCallback

    // Timer for each question
    useEffect(() => {
        if (gameState !== 'playing' || showResult) return;
        setTimeLeft(20);
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeout();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [currentIndex, gameState, showResult, handleTimeout]);

    const startGame = async (diff: Difficulty) => {
        // Check daily limit
        const status = dailyStatus[diff];
        if (status && !status.canPlay) {
            const resetTime = status.nextReset.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            toast.error(`Bạn đã luyện tập cấp ${diff === 'easy' ? 'DỄ' : diff === 'medium' ? 'VỪA' : 'KHÓ'} hôm nay rồi!\nReset lúc 00:00 (còn đến ${resetTime})`);
            return;
        }

        setDifficulty(diff);
        setGameState('loading');
        try {
            const res = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ difficulty: diff, count: 10 }),
            });
            const data = await res.json();
            if (!data.questions || data.questions.length === 0) {
                toast.error('Không thể tạo câu hỏi. Vui lòng thử lại.');
                setGameState('menu');
                return;
            }
            setQuestions(data.questions);
            setCurrentIndex(0);
            setScore(0);
            setCorrectCount(0);
            setSelectedAnswer(null);
            setShowResult(false);
            setQuestionResult(null);

            // Mark daily practice as used
            if (appUser) {
                try { await markDailyPracticeUsed(appUser.uid, diff); } catch { /* non-blocking */ }
                setDailyStatus(prev => ({ ...prev, [diff]: { canPlay: false, nextReset: new Date() } }));
            }

            setGameState('playing');
        } catch {
            toast.error('Lỗi kết nối. Vui lòng thử lại.');
            setGameState('menu');
        }
    };

    const nextQuestion = useCallback(() => {
        setCurrentIndex(i => {
            if (i + 1 >= questions.length) {
                finishGame();
                return i;
            }
            setSelectedAnswer(null);
            setShowResult(false);
            setQuestionResult(null);
            return i + 1;
        });
    }, [questions.length]);

    const scoreRef = useRef(0);

    // Initial effect to sync scoreRef with initial score value if needed, though they start at 0
    useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    const handleAnswer = async (index: number) => {
        if (selectedAnswer !== null || showResult) return;
        clearInterval(timerRef.current);
        const timeSpentMs = Date.now() - startTimeRef.current;
        setSelectedAnswer(index);
        setShowResult(true);

        const currentQ = questions[currentIndex];
        const isCorrect = index === currentQ.correctIndex;
        setQuestionResult(isCorrect ? 'correct' : 'wrong');

        let gained = 0;
        if (isCorrect) {
            const basePoints = difficulty === 'hard' ? 300 : difficulty === 'medium' ? 200 : 100;
            const timeBonus = Math.max(0, Math.floor((20000 - timeSpentMs) / 20000 * basePoints));
            gained = basePoints + timeBonus;
            setScore(s => s + gained);
            setCorrectCount(c => c + 1);
            scoreRef.current += gained;
        }

        if (appUser) {
            try {
                await savePracticeAttempt(appUser.uid, {
                    questionId: `ai-${currentIndex}`,
                    selectedIndex: index,
                    isCorrect,
                    timeSpentMs,
                });
            } catch { /* non-blocking */ }
        }

        setTimeout(() => nextQuestion(), 2000);
    };

    const finishGame = async () => {
        setGameState('result');
        if (appUser) {
            try {
                // Ensure we use the latest score via ref due to stale closures
                await updateUser(appUser.uid, {
                    totalPoints: (appUser.totalPoints || 0) + scoreRef.current,
                });
            } catch { /* non-blocking */ }
        }
    };

    if (loading || !appUser) {
        return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" /></div>;
    }

    const currentQ = questions[currentIndex];
    const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;
    const timerColor = timeLeft > 12 ? '#22c55e' : timeLeft > 6 ? '#ffc400' : '#ff2a2a';

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative">
            <FireBackgroundCanvas />
            <NavHeader />

            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-12">
                <AnimatePresence mode="wait">

                    {/* ── MENU ── */}
                    {gameState === 'menu' && (
                        <motion.div
                            key="menu"
                            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl pt-8"
                        >
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#ff2a2a]/20 border border-[#ff2a2a]/40 mb-4" style={{ boxShadow: '0 0 30px rgba(255,42,42,0.3)' }}>
                                    <Shield size={40} className="text-[#ff2a2a]" />
                                </div>
                                <h1 className="font-vn font-black text-4xl fire-gradient-text mb-1">CHIẾN BINH</h1>
                                <p className="text-[#9a9a9a] text-sm">AI tạo 10 câu hỏi ngẫu nhiên theo cấp độ • Mỗi ngày 1 lần</p>
                            </div>

                            {/* Difficulty Selection */}
                            <div className="fire-card p-6 mb-4">
                                <h2 className="font-vn font-bold text-white text-base mb-4 text-center flex items-center justify-center gap-2">
                                    <Zap size={16} className="text-[#ffc400]" /> CHỌN CẤP ĐỘ CHIẾN ĐẤU
                                </h2>
                                <div className="grid grid-cols-1 gap-3">
                                    {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG.easy][]).map(([diff, cfg]) => {
                                        const status = dailyStatus[diff];
                                        const locked = !loadingLimit && status && !status.canPlay;

                                        return (
                                            <motion.button
                                                key={diff}
                                                whileHover={!locked ? { x: 5 } : {}}
                                                whileTap={!locked ? { scale: 0.98 } : {}}
                                                onClick={() => startGame(diff)}
                                                disabled={loadingLimit || locked}
                                                className={`w-full text-left p-5 rounded-xl border transition-all duration-300 flex items-center gap-4 ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}10` }}
                                            >
                                                <span className="text-2xl">{locked ? '🔒' : cfg.emoji}</span>
                                                <div className="flex-1">
                                                    <div className="font-vn font-bold text-white text-sm">{cfg.label}</div>
                                                    <div className="text-[#9a9a9a] text-xs mt-0.5">
                                                        {locked ? 'Đã luyện hôm nay • Reset lúc 00:00' : cfg.desc}
                                                    </div>
                                                </div>
                                                {locked
                                                    ? <Lock size={18} color="#9a9a9a" />
                                                    : <ChevronRight size={20} style={{ color: cfg.color }} />
                                                }
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── LOADING (AI generating) ── */}
                    {gameState === 'loading' && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full max-w-md pt-24 text-center"
                        >
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#ff7a00]/20 border border-[#ff7a00]/40 mb-6 mx-auto" style={{ boxShadow: '0 0 30px rgba(255,122,0,0.3)' }}>
                                <Loader2 size={36} className="text-[#ff7a00] animate-spin" />
                            </div>
                            <h2 className="font-vn font-bold text-xl text-white mb-2">AI đang tạo câu hỏi...</h2>
                            <p className="text-[#9a9a9a] text-sm">Gemini đang soạn 10 câu hỏi độc đáo cho bạn 🤖</p>
                            <div className="mt-6 energy-bar">
                                <motion.div
                                    className="energy-bar-fill"
                                    animate={{ width: ['0%', '90%'] }}
                                    transition={{ duration: 4, ease: 'easeInOut' }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* ── PLAYING ── */}
                    {gameState === 'playing' && currentQ && (
                        <motion.div
                            key={`q-${currentIndex}`}
                            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="w-full max-w-2xl pt-4"
                        >
                            {/* Top bar */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#9a9a9a] text-sm">Câu</span>
                                    <span className="font-orbitron font-bold text-white">{currentIndex + 1}/{questions.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Flame size={16} style={{ color: timerColor }} />
                                    <motion.span
                                        key={timeLeft}
                                        initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                                        className="font-orbitron font-bold text-xl"
                                        style={{ color: timerColor }}
                                    >
                                        {timeLeft}s
                                    </motion.span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star size={16} className="text-[#ffc400]" />
                                    <span className="font-orbitron font-bold text-[#ffc400]">{score}</span>
                                </div>
                            </div>

                            {/* Progress bars */}
                            <div className="energy-bar mb-2">
                                <motion.div className="energy-bar-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                            </div>
                            <div className="energy-bar mb-5" style={{ height: '4px' }}>
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: timerColor, boxShadow: `0 0 8px ${timerColor}` }}
                                    animate={{ width: `${(timeLeft / 20) * 100}%` }}
                                    transition={{ duration: 1 }}
                                />
                            </div>

                            {/* Question */}
                            <div className="fire-card p-6 mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge variant={difficulty as 'easy' | 'medium' | 'hard'}>
                                        {difficulty === 'easy' ? 'DỄ' : difficulty === 'medium' ? 'VỪA' : 'KHÓ'}
                                    </Badge>
                                    <span className="text-[#9a9a9a] text-xs">🤖 AI • {currentQ.topic}</span>
                                </div>
                                <p className="text-white text-lg font-medium leading-relaxed">{currentQ.question}</p>
                            </div>

                            {/* Answer options */}
                            <div className="grid grid-cols-1 gap-3">
                                {currentQ.options.map((opt, i) => {
                                    let optClass = 'answer-option';
                                    if (showResult) {
                                        if (i === currentQ.correctIndex) optClass += ' correct';
                                        else if (i === selectedAnswer) optClass += ' wrong';
                                    } else if (i === selectedAnswer) {
                                        optClass += ' selected';
                                    }
                                    return (
                                        <motion.button
                                            key={i}
                                            whileHover={!showResult ? { x: 6 } : {}}
                                            whileTap={!showResult ? { scale: 0.98 } : {}}
                                            className={optClass}
                                            onClick={() => handleAnswer(i)}
                                            disabled={showResult}
                                        >
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-[#ff7a00] font-orbitron font-bold text-sm mr-3 flex-shrink-0">
                                                {LABELS[i]}
                                            </span>
                                            {opt}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            <AnimatePresence>
                                {showResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        className={`mt-4 p-4 rounded-xl border flex items-start gap-3 ${questionResult === 'correct' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}
                                    >
                                        {questionResult === 'correct'
                                            ? <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                                            : <XCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                                        }
                                        <div>
                                            <div className={`font-bold text-sm mb-1 ${questionResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                                                {questionResult === 'correct' ? '✓ Chính xác!' : selectedAnswer === null ? '⏱ Hết giờ!' : '✗ Sai rồi!'}
                                            </div>
                                            <p className="text-[#9a9a9a] text-sm">{currentQ.explanation}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* ── RESULT ── */}
                    {gameState === 'result' && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-2xl pt-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.2 }}
                                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#ffc400]/20 border border-[#ffc400]/40 mb-6"
                                style={{ boxShadow: '0 0 40px rgba(255,196,0,0.3)' }}
                            >
                                <Trophy size={48} className="text-[#ffc400]" />
                            </motion.div>

                            <h1 className="font-vn font-black text-4xl text-white mb-1">KẾT QUẢ</h1>
                            <div className="fire-gradient-text font-orbitron font-black text-6xl mb-6">{score} điểm</div>

                            <div className="grid grid-cols-3 gap-3 mb-8">
                                {[
                                    { label: 'Đúng', value: correctCount, color: '#22c55e' },
                                    { label: 'Sai', value: questions.length - correctCount, color: '#ff2a2a' },
                                    { label: 'Chính Xác', value: `${Math.round(correctCount / questions.length * 100)}%`, color: '#ffc400' },
                                ].map((s, i) => (
                                    <div key={i} className="fire-card p-5">
                                        <div className="font-orbitron font-bold text-2xl" style={{ color: s.color }}>{s.value}</div>
                                        <div className="text-[#9a9a9a] text-xs mt-1">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-4 text-sm text-[#9a9a9a] flex items-center justify-center gap-2">
                                <Lock size={14} />
                                Cấp độ {difficulty === 'easy' ? 'DỄ' : difficulty === 'medium' ? 'VỪA' : 'KHÓ'} đã hết lượt hôm nay. Quay lại lúc 00:00!
                            </div>

                            <div className="flex gap-4 justify-center flex-wrap">
                                <Button variant="outline" size="lg" onClick={() => setGameState('menu')} className="flex items-center gap-2">
                                    <Shield size={20} />
                                    Đổi Cấp Độ
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
