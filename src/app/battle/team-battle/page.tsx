'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import {
    getSessions, subscribeToSession, getSessionById,
    subscribeToSessionAnswers, submitAnswer, updateSession,
    getPublishedQuestions,
} from '@/lib/firestore';
import { Session, MapCell } from '@/types/session';
import { Question } from '@/types/question';
import { Answer } from '@/types/answer';
import { Users, Map, Trophy, ChevronRight, Zap, Flag } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const GRID_SIZE = 4;
const LABELS = ['A', 'B', 'C', 'D'];

export default function TeamBattlePage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();
    const [view, setView] = useState<'lobby' | 'waiting' | 'battle' | 'ended'>('lobby');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionCode, setSessionCode] = useState('');
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [mapCells, setMapCells] = useState<MapCell[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [timeUntilStart, setTimeUntilStart] = useState<string>('');
    const [teams, setTeams] = useState<{ id: string; name: string; color: string; score: number }[]>([]);

    useEffect(() => {
        if (!loading && !appUser) router.push('/auth/login');
    }, [appUser, loading, router]);

    useEffect(() => {
        getSessions().then(all => setSessions(all.filter(s => s.moduleType === 'team-battle' && (s.status === 'live' || s.status === 'scheduled'))));
    }, []);

    const joinSession = async (sessionId: string) => {
        const session = await getSessionById(sessionId);
        if (!session) { toast.error('Không tìm thấy phiên thi'); return; }
        setCurrentSession(session);

        // Load questions
        const qList: Question[] = [];
        for (const qid of session.questionIds) {
            const qs = await getPublishedQuestions();
            const q = qs.find(q => q.id === qid);
            if (q) qList.push(q);
        }
        setQuestions(qList);

        // Initialize map
        const cells: MapCell[] = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
            index: i, teamId: null, teamColor: null, teamName: null,
        }));
        setMapCells(cells);
        setView(session.status === 'live' ? 'battle' : 'waiting');

        // Subscribe to session updates
        subscribeToSession(sessionId, s => {
            if (s) {
                setCurrentSession(s);
                if (s.status === 'live') setView('battle');
                if (s.status === 'ended') setView('ended');
            }
        });

        // Subscribe to answers for map updates
        subscribeToSessionAnswers(sessionId, (allAnswers) => {
            setAnswers(allAnswers);
            // Build map - each question index maps to a cell
            const newCells = cells.map((cell, i) => {
                const qAnswers = allAnswers.filter(a => {
                    const q = qList[i];
                    return q && a.questionId === q.id && a.isCorrect;
                });
                if (qAnswers.length === 0) return cell;
                // First correct answer wins the cell
                const winner = qAnswers.sort((a, b) => {
                    const ta = a.submittedAt instanceof Date ? a.submittedAt.getTime() : 0;
                    const tb = b.submittedAt instanceof Date ? b.submittedAt.getTime() : 0;
                    return ta - tb;
                })[0];
                // Get team color from session teams (simplified)
                const teamColors: Record<string, string> = { TEAM01: '#ff2a2a', TEAM02: '#4a9eff', TEAM03: '#22c55e', TEAM04: '#a855f7' };
                return {
                    ...cell,
                    teamId: winner.teamId || null,
                    teamColor: winner.teamId ? (teamColors[winner.teamId] || '#ff7a00') : null,
                    teamName: winner.teamId || null,
                };
            });
            setMapCells(newCells);

            // Calculate team scores
            const scoreMap: Record<string, number> = {};
            newCells.forEach(cell => {
                if (cell.teamId) scoreMap[cell.teamId] = (scoreMap[cell.teamId] || 0) + 1;
            });
            setTeams(Object.entries(scoreMap).map(([id, score]) => ({
                id, name: id, color: '#ff7a00', score
            })).sort((a, b) => b.score - a.score));
        });
    };

    const submitTeamAnswer = async (answerIndex: number) => {
        if (!currentSession || !appUser || hasAnswered) return;
        const currentQ = questions[currentSession.currentQuestionIndex];
        if (!currentQ) return;

        setSelectedAnswer(answerIndex);
        setHasAnswered(true);

        const isCorrect = answerIndex === currentQ.correctIndex;
        try {
            await submitAnswer({
                sessionId: currentSession.id,
                questionId: currentQ.id,
                moduleType: 'team-battle',
                userId: appUser.uid,
                teamId: appUser.teamId || '',
                answerIndex,
                isCorrect,
            });
            toast(isCorrect ? '⚡ Đúng! Đội bạn chiếm vùng!' : '✗ Sai rồi!', {
                style: { background: isCorrect ? '#22c55e20' : '#ff2a2a20', border: `1px solid ${isCorrect ? '#22c55e' : '#ff2a2a'}40` }
            });
        } catch (e) {
            toast.error('Lỗi gửi câu trả lời');
        }
    };

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
                    setTimeUntilStart('Đang chờ Admin mở phiên thi...');
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [view, currentSession]);

    if (loading || !appUser) {
        return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" /></div>;
    }

    const currentQ = currentSession ? questions[currentSession.currentQuestionIndex] : null;

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative">
            <FireBackgroundCanvas />
            <NavHeader />

            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-12">
                <AnimatePresence mode="wait">
                    {/* LOBBY */}
                    {view === 'lobby' && (
                        <motion.div key="lobby" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-2xl pt-8">
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#4a9eff]/20 border border-[#4a9eff]/40 mb-4" style={{ boxShadow: '0 0 30px rgba(74,158,255,0.3)' }}>
                                    <Users size={40} className="text-[#4a9eff]" />
                                </div>
                                <h1 className="font-orbitron font-black text-4xl text-white mb-2">HỢP SỨC TÁC CHIẾN</h1>
                                <p className="text-[#9a9a9a]">Chiến đấu theo đội • Tranh chiếm bản đồ lãnh thổ</p>
                            </div>

                            {/* Join by code */}
                            <div className="fire-card p-6 mb-6">
                                <h3 className="font-orbitron font-bold text-white mb-4">NHẬP MÃ PHIÊN THI</h3>
                                <div className="flex gap-3">
                                    <Input
                                        placeholder="Nhập mã phiên..."
                                        value={sessionCode}
                                        onChange={e => setSessionCode(e.target.value.toUpperCase())}
                                        className="flex-1"
                                    />
                                    <Button variant="fire" onClick={() => { /* find by code */ toast.error('Nhập mã và tìm phiên bên dưới'); }}>
                                        Tham Gia
                                    </Button>
                                </div>
                            </div>

                            {/* Active sessions */}
                            <div className="fire-card p-6">
                                <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                                    <Flag size={18} className="text-[#ff7a00]" /> Phiên Thi Đang Mở
                                </h3>
                                {sessions.length === 0 ? (
                                    <div className="text-center py-8 text-[#9a9a9a]">
                                        <Map size={40} className="mx-auto mb-3 opacity-40" />
                                        <p>Chưa có phiên thi nào đang mở</p>
                                        <p className="text-sm mt-1">Liên hệ admin để mở phiên thi</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sessions.map(s => (
                                            <motion.div
                                                key={s.id}
                                                whileHover={{ x: 4 }}
                                                className="flex items-center justify-between p-4 rounded-xl border border-[#4a9eff]/30 bg-[#4a9eff]/5 cursor-pointer"
                                                onClick={() => joinSession(s.id)}
                                            >
                                                <div>
                                                    <div className="font-orbitron font-bold text-white">{s.title}</div>
                                                    <div className="text-[#9a9a9a] text-sm flex items-center gap-1">
                                                        {s.questionIds.length} câu • {s.teamIds.length} đội
                                                        {s.scheduledStartAt && ` • 🕒 ${formatStartTime(s.scheduledStartAt)}`}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={s.status === 'live' ? 'live' : 'draft'}>{s.status === 'live' ? 'ĐANG MỞ' : 'SẮP BẮT ĐẦU'}</Badge>
                                                    <ChevronRight size={16} className="text-[#4a9eff]" />
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
                        <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-xl pt-12 text-center">
                            <div className="inline-flex w-24 h-24 rounded-full bg-[#4a9eff]/20 border border-[#4a9eff]/40 items-center justify-center mb-6 animate-pulse">
                                <Users size={48} className="text-[#4a9eff]" />
                            </div>
                            <h2 className="font-orbitron font-bold text-2xl text-white mb-2">PHÒNG CHỜ</h2>
                            <p className="text-[#9a9a9a] mb-4">{currentSession?.title}</p>
                            <p className="text-[#ff7a00] text-lg font-bold">{timeUntilStart || 'Đợi admin mở phiên thi...'}</p>
                            {currentSession?.scheduledStartAt && (
                                <p className="text-[#9a9a9a] mt-2 text-sm">Giờ mở dự kiến: {formatStartTime(currentSession.scheduledStartAt)}</p>
                            )}
                        </motion.div>
                    )}

                    {/* BATTLE */}
                    {view === 'battle' && currentSession && (
                        <motion.div key="battle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-5xl pt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Map Grid */}
                                <div className="lg:col-span-2">
                                    <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                                        <Map size={18} className="text-[#ff7a00]" /> BẢN ĐỒ LÃNH THỔ
                                    </h3>
                                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
                                        {mapCells.map((cell, i) => (
                                            <motion.div
                                                key={i}
                                                className="map-cell aspect-square rounded-lg flex items-center justify-center font-orbitron font-bold text-lg relative"
                                                style={{
                                                    background: cell.teamColor ? `${cell.teamColor}30` : 'rgba(255,255,255,0.03)',
                                                    border: `2px solid ${cell.teamColor || 'rgba(255,255,255,0.1)'}`,
                                                    boxShadow: cell.teamColor ? `0 0 20px ${cell.teamColor}44` : 'none',
                                                    color: cell.teamColor || '#9a9a9a',
                                                }}
                                                animate={cell.teamColor ? { scale: [1, 1.05, 1] } : {}}
                                                transition={{ duration: 0.4 }}
                                            >
                                                <span className="text-xs opacity-60">{i + 1}</span>
                                                {cell.teamId && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Flag size={20} style={{ color: cell.teamColor || '#fff' }} />
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Question + Scoreboard */}
                                <div className="space-y-4">
                                    {/* Scoreboard */}
                                    <div className="fire-card p-4">
                                        <h4 className="font-orbitron font-bold text-white text-sm mb-3 flex items-center gap-2">
                                            <Trophy size={14} className="text-[#ffc400]" /> BXH ĐỘI
                                        </h4>
                                        {teams.map((t, i) => (
                                            <div key={t.id} className="flex items-center gap-2 mb-2">
                                                <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                                                <span className="text-white text-sm flex-1">{t.name}</span>
                                                <span className="font-orbitron text-[#ffc400] font-bold">{t.score}</span>
                                            </div>
                                        ))}
                                        {teams.length === 0 && <p className="text-[#9a9a9a] text-sm">Chưa có điểm</p>}
                                    </div>

                                    {/* Current Question */}
                                    {currentQ ? (
                                        <div className="fire-card p-5">
                                            <div className="text-[#9a9a9a] text-xs mb-3">
                                                Câu {currentSession.currentQuestionIndex + 1}/{questions.length}
                                            </div>
                                            <p className="text-white font-medium mb-4 text-sm leading-relaxed">{currentQ.question}</p>
                                            <div className="space-y-2">
                                                {currentQ.options.map((opt, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => submitTeamAnswer(i)}
                                                        disabled={hasAnswered}
                                                        className={`answer-option text-sm ${selectedAnswer === i ? (i === currentQ.correctIndex ? 'correct' : 'wrong') : ''}`}
                                                    >
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-[#ff7a00] font-bold text-xs mr-2">
                                                            {LABELS[i]}
                                                        </span>
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                            {hasAnswered && <p className="text-center text-[#9a9a9a] text-sm mt-3">Đã trả lời • Đợi câu tiếp theo...</p>}
                                        </div>
                                    ) : (
                                        <div className="fire-card p-5 text-center text-[#9a9a9a]">
                                            <Zap size={24} className="mx-auto mb-2 text-[#ff7a00]" />
                                            <p className="text-sm">Đợi câu hỏi từ admin...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ENDED */}
                    {view === 'ended' && (
                        <motion.div key="ended" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl pt-12 text-center">
                            <Trophy size={64} className="mx-auto text-[#ffc400] mb-4" />
                            <h2 className="font-orbitron font-black text-4xl fire-gradient-text mb-4">PHIÊN KẾT THÚC!</h2>
                            {teams[0] && (
                                <div className="fire-card p-6 mb-6">
                                    <p className="text-[#9a9a9a] mb-1">🏆 ĐỘI CHIẾN THẮNG</p>
                                    <div className="font-orbitron font-black text-3xl text-white">{teams[0].name}</div>
                                    <div className="text-[#ffc400] mt-1">{teams[0].score} vùng chiếm được</div>
                                </div>
                            )}
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
