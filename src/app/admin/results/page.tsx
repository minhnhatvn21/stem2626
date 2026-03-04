'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { getLeaderboard, getSessions, getAnswersForSession } from '@/lib/firestore';
import { AppUser } from '@/types/user';
import { Session } from '@/types/session';
import { Answer } from '@/types/answer';
import { Trophy, Zap, Star, RotateCcw, Medal } from 'lucide-react';

export default function AdminResultsPage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();
    const [leaderboard, setLeaderboard] = useState<AppUser[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<string>('');
    const [sessionAnswers, setSessionAnswers] = useState<Answer[]>([]);

    useEffect(() => {
        if (!loading && (!appUser || appUser.role !== 'admin')) router.push('/unauthorized');
    }, [appUser, loading, router]);

    useEffect(() => {
        if (!appUser?.role === true) return;
        getLeaderboard(20).then(setLeaderboard);
        getSessions().then(setSessions);
    }, [appUser]);

    useEffect(() => {
        if (!selectedSession) return;
        getAnswersForSession(selectedSession).then(setSessionAnswers);
    }, [selectedSession]);

    const sessionScoreboard = (() => {
        if (!selectedSession || sessionAnswers.length === 0) return [];
        const scores: Record<string, { score: number; correct: number; name: string }> = {};
        sessionAnswers.forEach(a => {
            if (!scores[a.userId]) scores[a.userId] = { score: 0, correct: 0, name: a.userId };
            if (a.isCorrect) { scores[a.userId].score += 100; scores[a.userId].correct += 1; }
        });
        return Object.entries(scores).map(([uid, s]) => ({ uid, ...s })).sort((a, b) => b.score - a.score);
    })();

    if (loading || !appUser) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" /></div>;

    const endedSessions = sessions.filter(s => s.status === 'ended');

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative">
            <FireBackgroundCanvas />
            <NavHeader />
            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-12">
                <div className="w-full max-w-6xl">
                    <div className="mb-8">
                        <h1 className="font-orbitron font-bold text-2xl text-white mb-1">KẾT QUẢ & VINH DANH</h1>
                        <p className="text-[#9a9a9a] text-sm">Bảng xếp hạng và kết quả phiên thi</p>
                    </div>

                    {/* Top 3 Podium */}
                    {leaderboard.length >= 3 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="fire-card p-8 mb-8 text-center"
                            style={{ boxShadow: '0 0 40px rgba(255,196,0,0.2)' }}
                        >
                            <h3 className="font-orbitron font-bold text-[#ffc400] text-xl mb-6">🏆 TOP 3 CHIẾN BINH</h3>
                            <div className="flex items-end justify-center gap-4">
                                {/* 2nd */}
                                <div className="text-center">
                                    <div className="text-4xl mb-2">🥈</div>
                                    <div className="bg-[#c0c0c0]/20 border border-[#c0c0c0]/30 rounded-t-xl px-6 py-4 h-24 flex flex-col justify-end">
                                        <div className="font-orbitron font-bold text-white text-sm">{leaderboard[1]?.displayName}</div>
                                        <div className="text-[#c0c0c0] text-xs">{leaderboard[1]?.totalPoints} điểm</div>
                                    </div>
                                </div>
                                {/* 1st */}
                                <div className="text-center">
                                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl mb-2">👑</motion.div>
                                    <div className="bg-[#ffc400]/20 border border-[#ffc400]/40 rounded-t-xl px-8 py-4 h-32 flex flex-col justify-end" style={{ boxShadow: '0 -20px 40px rgba(255,196,0,0.2)' }}>
                                        <div className="font-orbitron font-bold text-[#ffc400] text-base">{leaderboard[0]?.displayName}</div>
                                        <div className="text-[#ffc400] text-sm font-bold">{leaderboard[0]?.totalPoints} điểm</div>
                                    </div>
                                </div>
                                {/* 3rd */}
                                <div className="text-center">
                                    <div className="text-4xl mb-2">🥉</div>
                                    <div className="bg-[#cd7f32]/20 border border-[#cd7f32]/30 rounded-t-xl px-6 py-4 h-20 flex flex-col justify-end">
                                        <div className="font-orbitron font-bold text-white text-sm">{leaderboard[2]?.displayName}</div>
                                        <div className="text-[#cd7f32] text-xs">{leaderboard[2]?.totalPoints} điểm</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Global Leaderboard */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="fire-card p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <Trophy size={20} className="text-[#ffc400]" />
                                <h3 className="font-orbitron font-bold text-white">BXH TOÀN HỆ THỐNG</h3>
                            </div>
                            <div className="space-y-2">
                                {leaderboard.map((user, i) => (
                                    <div key={user.uid} className={`scoreboard-row ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''}`}>
                                        <div className="w-7 text-center font-orbitron font-bold text-sm" style={{ color: i === 0 ? '#ffc400' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#9a9a9a' }}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 text-white font-medium ml-3 text-sm">{user.displayName}</div>
                                        <div className="text-[#9a9a9a] text-xs mr-3 hidden md:block">{user.email}</div>
                                        <div className="font-orbitron font-bold text-[#ffc400]">{user.totalPoints}</div>
                                    </div>
                                ))}
                                {leaderboard.length === 0 && <p className="text-[#9a9a9a] text-center py-6">Chưa có dữ liệu</p>}
                            </div>
                        </motion.div>

                        {/* Session Results */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="fire-card p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <Zap size={20} className="text-[#ff7a00]" />
                                <h3 className="font-orbitron font-bold text-white">KẾT QUẢ PHIÊN THI</h3>
                            </div>
                            <select
                                className="input-fire mb-4"
                                value={selectedSession}
                                onChange={e => setSelectedSession(e.target.value)}
                            >
                                <option value="">Chọn phiên thi...</option>
                                {endedSessions.map(s => <option key={s.id} value={s.id}>{s.title} ({s.moduleType})</option>)}
                            </select>
                            {sessionScoreboard.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="text-[#9a9a9a] text-sm mb-3">{sessionAnswers.length} lượt trả lời</div>
                                    {sessionScoreboard.map((entry, i) => (
                                        <div key={entry.uid} className={`scoreboard-row ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''}`}>
                                            <div className="w-7 text-center font-orbitron font-bold text-sm" style={{ color: i === 0 ? '#ffc400' : '#9a9a9a' }}>{i + 1}</div>
                                            <div className="flex-1 text-white ml-3 text-sm">{entry.name}</div>
                                            <div className="text-[#9a9a9a] text-xs mr-3">{entry.correct} đúng</div>
                                            <div className="font-orbitron font-bold text-[#ffc400]">{entry.score}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : selectedSession ? (
                                <p className="text-[#9a9a9a] text-center py-6">Không có dữ liệu cho phiên này</p>
                            ) : (
                                <p className="text-[#9a9a9a] text-center py-6">Chọn phiên thi để xem kết quả</p>
                            )}
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
}
