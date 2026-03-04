'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
    createDuelRoom,
    getDuelRoom,
    updateDuelRoom,
    subscribeToDuelRoom,
    submitDuelAnswer,
    subscribeToDuelAnswers,
    getAllQuestions,
    getUserById,
    updateUser
} from '@/lib/firestore';
import { DuelRoom, DuelAnswer } from '@/types/duel';
import { Question, Difficulty } from '@/types/question';
import { Swords, ChevronRight, Zap, Target, Star, Loader2, Play } from 'lucide-react';
import toast from 'react-hot-toast';

const LABELS = ['A', 'B', 'C', 'D'];

export default function DuelPage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();

    const [view, setView] = useState<'lobby' | 'waiting' | 'vs' | 'playing' | 'result'>('lobby');
    const [joinCode, setJoinCode] = useState('');
    const [room, setRoom] = useState<DuelRoom | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [opponentName, setOpponentName] = useState<string>('Đang tìm đối thủ...');

    // Battle state
    const [timeLeft, setTimeLeft] = useState(15);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [answers, setAnswers] = useState<DuelAnswer[]>([]);

    // UI Effects
    const [generating, setGenerating] = useState(false);

    const timerRef = useRef<ReturnType<typeof setInterval>>();
    const startTimeRef = useRef<number>(0);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const handleDragEnd = (event: any, info: any, index: number) => {
        if (!dropZoneRef.current || hasAnswered || selectedAnswer !== null) return;
        const dropRect = dropZoneRef.current.getBoundingClientRect();
        const { x, y } = info.point;
        const padding = 30; // Forgiving drop area

        if (
            x >= dropRect.left - padding &&
            x <= dropRect.right + padding &&
            y >= dropRect.top - padding &&
            y <= dropRect.bottom + padding
        ) {
            handleAnswerClick(index);
        }
    };

    useEffect(() => {
        if (!loading && !appUser) router.push('/auth/login');
    }, [appUser, loading, router]);

    // Handle fetching opponent name
    useEffect(() => {
        if (!room || !appUser) return;
        const opponentId = room.hostId === appUser.uid ? room.guestId : room.hostId;
        if (opponentId) {
            getUserById(opponentId).then(u => {
                if (u?.displayName) setOpponentName(u.displayName);
            });
        }
    }, [room?.hostId, room?.guestId, appUser]);

    // --- GAME LOGIC ---
    const hasAnsweredRef = useRef(false);
    useEffect(() => {
        hasAnsweredRef.current = hasAnswered;
    }, [hasAnswered]);

    useEffect(() => {
        if (view === 'playing' && room) {
            setTimeLeft(20);
            startTimeRef.current = Date.now();

            // Re-assign timer
            timerRef.current = setInterval(() => {
                setTimeLeft(t => {
                    if (t <= 1) {
                        clearInterval(timerRef.current);

                        // If not answered, submit wrong answer
                        if (!hasAnsweredRef.current) {
                            handleTimeout();
                        }

                        // Both Host and Guest will try to advance to prevent getting stuck
                        setTimeout(async () => {
                            try {
                                const latestRoom = await getDuelRoom(room.id);
                                if (latestRoom && latestRoom.currentQuestionIndex === room.currentQuestionIndex) {
                                    const next = room.currentQuestionIndex + 1;
                                    if (next >= latestRoom.questions.length) {
                                        await updateDuelRoom(room.id, { status: 'ended' });
                                    } else {
                                        await updateDuelRoom(room.id, { currentQuestionIndex: next });
                                    }
                                }
                            } catch (e) {
                                console.error('Failed to advance question', e);
                            }
                        }, 3000); // 3 seconds to review answers

                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
            return () => clearInterval(timerRef.current);
        }
    }, [room?.currentQuestionIndex, view]);

    // Reset local state when question changes
    useEffect(() => {
        if (room) {
            setCurrentIndex(room.currentQuestionIndex);
            setSelectedAnswer(null);
            setHasAnswered(false);
        }
    }, [room?.currentQuestionIndex]);

    const handleCreateRoom = async () => {
        if (!appUser) return;
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newRoom: Omit<DuelRoom, 'createdAt' | 'updatedAt' | 'startedAt'> = {
            id: code,
            status: 'waiting',
            hostId: appUser.uid,
            guestId: null,
            hostScore: 0,
            guestScore: 0,
            questions: [],
            currentQuestionIndex: 0,
            difficulty: 'medium'
        };

        try {
            await createDuelRoom(newRoom);
            setRoom(newRoom as DuelRoom); // temp set before sub
            subscribeToDuel(code);
            setView('waiting');
            toast.success(`Tạo phòng thành công! Mã: ${code}`);
        } catch (e: any) {
            console.error('Lỗi tạo phòng chi tiết:', e);
            toast.error('Lỗi tạo phòng: ' + (e.message || String(e)));
        }
    };

    const handleJoinRoom = async () => {
        if (!appUser || !joinCode) return;
        const code = joinCode.toUpperCase();
        try {
            const r = await getDuelRoom(code);
            if (!r) { toast.error('Không tìm thấy phòng!'); return; }
            if (r.status !== 'waiting') { toast.error('Phòng đang đấu hoặc đã kết thúc!'); return; }
            if (r.hostId === appUser.uid) { toast.error('Bạn là chủ phòng này rồi!'); return; }

            await updateDuelRoom(code, {
                guestId: appUser.uid,
                status: 'waiting' // host will press start to move to VS
            });

            subscribeToDuel(code);
            setView('waiting');
            toast.success('Vào phòng thành công!');
        } catch (e) {
            toast.error('Lỗi vào phòng!');
        }
    };

    const subscribeToDuel = (code: string) => {
        subscribeToDuelRoom(code, (r) => {
            if (!r) return;
            setRoom(r);
            if (r.status === 'playing' && view !== 'playing') setView('playing');
            if (r.status === 'ended' && view !== 'result') finishDuel(r);
        });

        subscribeToDuelAnswers(code, (as) => {
            setAnswers(as);
        });
    };

    const handleStartDuel = async () => {
        if (!room || !appUser || room.hostId !== appUser.uid) return;

        setGenerating(true);
        try {
            // Generate Questions
            const res = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ difficulty: room.difficulty, count: 30 }), // 30 questions
            });
            const data = await res.json();

            if (!data.questions || data.questions.length === 0) throw new Error('No AI qs');

            // Save questions directly to Duel room and transition state
            await updateDuelRoom(room.id, {
                questions: data.questions,
                status: 'playing',
                startedAt: new Date(),
                currentQuestionIndex: 0,
            });

            setGenerating(false);
        } catch (e) {
            setGenerating(false);
            console.error(e);
            toast.error('Lỗi khi tải câu hỏi, bạn thử lại nhé!');
        }
    };

    const handleTimeout = () => {
        submitDuelAnswerFunc(-1, false, 20000);
    };

    const submitDuelAnswerFunc = async (index: number, isCorrect: boolean, timeSpentMs: number) => {
        if (!room || !appUser || hasAnswered) return;

        setSelectedAnswer(index);
        setHasAnswered(true);

        const earned = isCorrect ? 100 + Math.max(0, Math.floor((20000 - timeSpentMs) / 20000 * 100)) : 0;

        try {
            // First submit the answer record (for sync)
            await submitDuelAnswer({
                roomId: room.id,
                questionId: room.currentQuestionIndex.toString(),
                userId: appUser.uid,
                answerIndex: index,
                isCorrect,
                timeSpentMs,
                submittedAt: new Date(),
            });

            // If we gained points, instantly update the room's score for real-time health bar
            if (earned > 0) {
                const isHost = room.hostId === appUser.uid;
                await updateDuelRoom(room.id, {
                    [isHost ? 'hostScore' : 'guestScore']: (isHost ? room.hostScore : room.guestScore) + earned
                });
            }
        } catch (e) {
            console.error(e);
            toast.error('Gặp lỗi khi gửi đáp án!');
        }
    };

    const handleAnswerClick = (index: number) => {
        if (!room || selectedAnswer !== null || hasAnswered) return;
        const currentQ = room.questions[room.currentQuestionIndex];
        const isCorrect = index === currentQ.correctIndex;
        const timeSpent = Date.now() - startTimeRef.current;
        submitDuelAnswerFunc(index, isCorrect, timeSpent);
    };

    const finishDuel = async (r: DuelRoom) => {
        setView('result');
        if (appUser) {
            const isHost = r.hostId === appUser.uid;
            const myScore = isHost ? r.hostScore : r.guestScore;
            try {
                // Update global points
                if (myScore > 0) {
                    await updateUser(appUser.uid, {
                        totalPoints: (appUser.totalPoints || 0) + myScore
                    });
                }
            } catch { /* ignore */ }
        }
    };

    if (loading || !appUser) return <div className="min-h-screen bg-[#0a0a0a]" />;

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
            <FireBackgroundCanvas />
            {/* Custom purple tint overlay for Duel Mode */}
            <div className="absolute inset-0 bg-[#a855f7]/5 pointer-events-none mix-blend-screen" />
            <NavHeader />

            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-12">
                <AnimatePresence mode="wait">
                    {/* LOBBY */}
                    {view === 'lobby' && (
                        <motion.div key="lobby" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md pt-8 text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/40 mb-6 shadow-[0_0_40px_rgba(168,85,247,0.3)]">
                                <Swords size={48} className="text-[#a855f7]" />
                            </div>
                            <h1 className="font-orbitron font-black text-4xl text-white mb-2" style={{ textShadow: '0 0 20px #a855f7' }}>THÁCH ĐẤU 1v1</h1>
                            <p className="text-[#9a9a9a] text-sm mb-10">Phân tài cao thấp với câu hỏi AI sinh ngẫu nhiên</p>

                            <div className="fire-card p-6 border-[#a855f7]/30 bg-[#a855f7]/5">
                                <Button className="w-full mb-4 bg-gradient-to-r from-[#d946ef] to-[#a855f7] hover:from-[#e879f9] hover:to-[#c084fc] text-white border-0 shadow-[0_0_20px_rgba(217,70,239,0.4)]" onClick={handleCreateRoom}>
                                    Tạo Phòng Mới
                                </Button>
                                <div className="relative flex items-center py-4">
                                    <div className="flex-grow border-t border-white/10" />
                                    <span className="flex-shrink-0 mx-4 text-[#9a9a9a] text-sm font-medium">HOẶC</span>
                                    <div className="flex-grow border-t border-white/10" />
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nhập mã phòng (6 ký tự)"
                                        className="input-fire flex-1 text-center font-mono font-bold tracking-widest uppercase focus:border-[#a855f7]"
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value.substring(0, 6).toUpperCase())}
                                        maxLength={6}
                                    />
                                    <Button variant="outline" className="border-[#a855f7]/40 text-[#a855f7] hover:bg-[#a855f7]/10" onClick={handleJoinRoom}>
                                        Vào
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* WAITING / VS */}
                    {view === 'waiting' && room && (
                        <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl text-center pt-8">
                            <h2 className="font-orbitron text-xl text-[#9a9a9a] mb-2">MÃ PHÒNG</h2>
                            <div className="font-mono font-black text-6xl text-white tracking-[0.2em] mb-12 shadow-[0_0_30px_#a855f7] inline-block px-8 py-4 rounded-2xl bg-[#a855f7]/10 border border-[#a855f7]/40">
                                {room.id}
                            </div>

                            <div className="flex items-center justify-center gap-8 md:gap-16">
                                {/* Current User (Host or Guest) */}
                                <div className="flex flex-col items-center">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#22c55e] bg-[#22c55e]/10 flex items-center justify-center mb-4 shadow-[0_0_30px_#22c55e40]">
                                        <span className="font-orbitron font-bold text-4xl">{appUser.displayName?.[0]}</span>
                                    </div>
                                    <div className="font-orbitron font-bold text-xl text-white">{appUser.displayName}</div>
                                    <div className="text-[#22c55e] text-sm mt-1">{room.hostId === appUser.uid ? 'CHỦ PHÒNG' : 'NGƯỜI CHƠI'}</div>
                                </div>

                                {/* VS Box */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className="font-orbitron font-black text-6xl italic text-[#a855f7] mb-2" style={{ textShadow: '2px 2px 0 #d946ef' }}>VS</div>
                                </div>

                                {/* Opponent */}
                                <div className="flex flex-col items-center">
                                    {room.guestId || (room.hostId !== appUser.uid && room.hostId) ? (
                                        <>
                                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#ff2a2a] bg-[#ff2a2a]/10 flex items-center justify-center mb-4 shadow-[0_0_30px_#ff2a2a40]">
                                                <span className="font-orbitron font-bold text-4xl">{opponentName[0] || '?'}</span>
                                            </div>
                                            <div className="font-orbitron font-bold text-xl text-white">{opponentName}</div>
                                            <div className="text-[#ff2a2a] text-sm mt-1">{room.hostId !== appUser.uid ? 'CHỦ PHÒNG' : 'NGƯỜI CHƠI'}</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#333] border-dashed bg-[#111] flex items-center justify-center mb-4">
                                                <Loader2 size={32} className="text-[#666] animate-spin" />
                                            </div>
                                            <div className="font-orbitron font-bold text-xl text-[#666]">Đang chờ...</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="mt-16">
                                {room.hostId === appUser.uid ? (
                                    <Button size="lg" disabled={!room.guestId || generating} className="bg-[#a855f7] hover:bg-[#d946ef] text-white border-0" onClick={handleStartDuel}>
                                        {generating ? <><Loader2 size={18} className="mr-2 animate-spin" /> Đang tạo trận...</> : <><Play size={18} className="mr-2" /> Bắt Đầu Thách Đấu</>}
                                    </Button>
                                ) : (
                                    <p className="text-[#9a9a9a] italic">Đang chờ chủ phòng bắt đầu...</p>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* PLAYING BATTLE */}
                    {view === 'playing' && room && room.questions[currentIndex] && (
                        <motion.div key="playing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl pt-4">
                            {/* Health Bars / Scores Overlay */}
                            <div className="flex justify-between items-center mb-6">
                                {/* Host Status */}
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full border-2 border-[#fff] bg-[#22c55e]/20 flex items-center justify-center font-bold">
                                        {room.hostId === appUser.uid ? 'BẠN' : room.hostId.substring(0, 2)}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-xl">{room.hostScore}</div>
                                        <div className="text-[#22c55e] text-xs">Điểm Chiến Hữu</div>
                                    </div>
                                </div>

                                {/* Timer */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className="text-[#a855f7] font-bold text-3xl font-orbitron drop-shadow-[0_0_10px_#a855f7]">{timeLeft}s</div>
                                </div>

                                {/* Guest Status */}
                                <div className="flex items-center gap-3 text-right">
                                    <div>
                                        <div className="text-white font-bold text-xl">{room.guestScore}</div>
                                        <div className="text-[#ff2a2a] text-xs">Điểm Đối Thủ</div>
                                    </div>
                                    <div className="w-12 h-12 rounded-full border-2 border-[#fff] bg-[#ff2a2a]/20 flex items-center justify-center font-bold">
                                        {room.guestId === appUser.uid ? 'BẠN' : opponentName[0] || '?'}
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar showing rounds */}
                            <div className="w-full bg-white/10 h-2 rounded-full mb-6 overflow-hidden flex">
                                {room.questions.map((_, i) => (
                                    <div key={i} className="h-full flex-1 border-r border-[#0a0a0a]" style={{ background: i < currentIndex ? '#a855f7' : i === currentIndex ? '#e879f9' : 'transparent' }} />
                                ))}
                            </div>

                            {/* Question & Drop Zone */}
                            <div className="fire-card p-6 mb-6 border-[#a855f7]/30 shadow-[0_0_30px_rgba(168,85,247,0.15)] text-center min-h-[140px] flex flex-col items-center justify-center relative">
                                <h3 className="text-white text-2xl font-medium leading-relaxed mb-6">{room.questions[currentIndex].question}</h3>

                                {room.questions[currentIndex].type === 'drag-drop' && (
                                    <div
                                        ref={dropZoneRef}
                                        className={`w-full max-w-md h-24 border-2 border-dashed rounded-xl flex items-center justify-center transition-all ${hasAnswered
                                            ? selectedAnswer === room.questions[currentIndex].correctIndex
                                                ? 'border-[#22c55e] bg-[#22c55e]/20 text-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                                : 'border-[#ff2a2a] bg-[#ff2a2a]/20 text-[#ff2a2a] shadow-[0_0_20px_rgba(255,42,42,0.4)]'
                                            : 'border-[#a855f7] bg-[#a855f7]/10 text-[#a855f7] animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                            }`}
                                    >
                                        {hasAnswered && selectedAnswer !== null ? (
                                            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-bold text-xl flex items-center gap-2">
                                                {selectedAnswer === room.questions[currentIndex].correctIndex ? '✅' : '❌'} {room.questions[currentIndex].options[selectedAnswer]}
                                            </motion.div>
                                        ) : (
                                            <span className="font-bold opacity-70 tracking-widest uppercase">LÕI NĂNG LƯỢNG (Kéo thả vào đây)</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Answers */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {room.questions[currentIndex].options.map((opt: string, i: number) => {
                                    const currentQ = room.questions[currentIndex];
                                    const isDragDrop = currentQ.type === 'drag-drop';
                                    let optClass = 'answer-option hover:border-[#a855f7] hover:bg-[#a855f7]/10';

                                    // If answered, show correct/wrong
                                    if (hasAnswered) {
                                        if (i === currentQ.correctIndex) optClass = 'answer-option correct'; // always reveal correct
                                        else if (i === selectedAnswer) optClass = 'answer-option wrong'; // if this was our wrong guess
                                    } else if (i === selectedAnswer) {
                                        optClass += ' selected';
                                    }

                                    return isDragDrop ? (
                                        <motion.div
                                            key={i}
                                            drag={!hasAnswered}
                                            dragSnapToOrigin
                                            onDragEnd={(event, info) => handleDragEnd(event, info, i)}
                                            whileHover={!hasAnswered ? { scale: 1.05 } : {}}
                                            whileDrag={{ scale: 1.1, zIndex: 50, rotate: 2 }}
                                            className={`${optClass} cursor-grab active:cursor-grabbing relative z-10 flex items-center p-4`}
                                            style={{ touchAction: 'none' }}
                                        >
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-[#a855f7] font-bold text-sm mr-3 flex-shrink-0">
                                                {LABELS[i]}
                                            </span>
                                            {opt}
                                        </motion.div>
                                    ) : (
                                        <motion.button
                                            key={i}
                                            whileHover={!hasAnswered ? { scale: 1.02 } : {}}
                                            whileTap={!hasAnswered ? { scale: 0.98 } : {}}
                                            className={optClass}
                                            onClick={() => handleAnswerClick(i)}
                                            disabled={hasAnswered}
                                        >
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-[#a855f7] font-bold text-sm mr-3 flex-shrink-0">
                                                {LABELS[i]}
                                            </span>
                                            {opt}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Status msg / wait for next logic */}
                            <AnimatePresence>
                                {hasAnswered && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center text-[#ffc400] font-bold animate-pulse">
                                        Đã khóa đáp án. Đợi chủ phòng chuyển câu...
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* RESULT VIEW */}
                    {view === 'result' && room && (
                        <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl pt-12 text-center">
                            <div className="font-orbitron font-black text-4xl mb-8" style={{ color: '#a855f7', textShadow: '0 0 20px #a855f7' }}>KẾT THÚC THÁCH ĐẤU</div>

                            <div className="flex items-center justify-center gap-8 md:gap-16 mb-12">
                                <div className={`flex flex-col items-center ${room.hostScore >= room.guestScore ? 'scale-110 drop-shadow-[0_0_30px_#a855f7]' : 'opacity-70 grayscale'}`}>
                                    <div className="text-white text-lg font-bold mb-2">{room.hostId === appUser.uid ? 'BẠN' : 'CHỦ PHÒNG'}</div>
                                    <div className="text-5xl font-black text-[#a855f7]">{room.hostScore}</div>
                                </div>
                                <div className="text-[#666] font-bold text-2xl">VS</div>
                                <div className={`flex flex-col items-center ${room.guestScore >= room.hostScore ? 'scale-110 drop-shadow-[0_0_30px_#a855f7]' : 'opacity-70 grayscale'}`}>
                                    <div className="text-white text-lg font-bold mb-2">{room.guestId === appUser.uid ? 'BẠN' : opponentName}</div>
                                    <div className="text-5xl font-black text-[#a855f7]">{room.guestScore}</div>
                                </div>
                            </div>

                            <p className="text-2xl font-bold fire-gradient-text mb-8">
                                {room.hostScore === room.guestScore ? 'HÒA NHAU!' :
                                    ((room.hostScore > room.guestScore && room.hostId === appUser.uid) ||
                                        (room.guestScore > room.hostScore && room.guestId === appUser.uid)) ? '🎉 BẠN ĐÃ CHIẾN THẮNG 🎉' : '💀 THẤT BẠI 💀'}
                            </p>

                            <Button onClick={() => setView('lobby')} variant="outline" className="border-[#a855f7] text-[#a855f7]">Về Sảnh Đợi</Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
