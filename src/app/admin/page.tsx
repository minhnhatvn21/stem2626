'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { getAllQuestions, getTeams, getSessions, getLeaderboard } from '@/lib/firestore';
import { Question } from '@/types/question';
import { Team, Session } from '@/types/session';
import { AppUser } from '@/types/user';
import { LayoutDashboard, Users, FileQuestion, Settings, Trophy, Zap, Activity, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [leaderboard, setLeaderboard] = useState<AppUser[]>([]);

    useEffect(() => {
        if (!loading && !appUser) { router.push('/auth/login'); return; }
        if (!loading && appUser && appUser.role !== 'admin') { router.push('/unauthorized'); return; }
    }, [appUser, loading, router]);

    useEffect(() => {
        if (!appUser || appUser.role !== 'admin') return;
        getAllQuestions().then(setQuestions);
        getTeams().then(setTeams);
        getSessions().then(setSessions);
        getLeaderboard(5).then(setLeaderboard);
    }, [appUser]);

    if (loading || !appUser || appUser.role !== 'admin') {
        return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" /></div>;
    }

    const publishedCount = questions.filter(q => q.status === 'published').length;
    const liveSession = sessions.find(s => s.status === 'live');

    const cards = [
        { title: 'Câu Hỏi', value: questions.length, sub: `${publishedCount} published`, icon: <FileQuestion size={24} />, href: '/admin/questions', color: '#ff7a00' },
        { title: 'Đội Thi', value: teams.length, sub: `${teams.reduce((s, t) => s + t.memberIds.length, 0)} thành viên`, icon: <Users size={24} />, href: '/admin/teams', color: '#4a9eff' },
        { title: 'Phiên Thi', value: sessions.length, sub: liveSession ? '🔴 ĐANG DIỄN RA' : 'Không có phiên sống', icon: <Settings size={24} />, href: '/admin/sessions', color: '#22c55e' },
        { title: 'Học Sinh', value: leaderboard.length, sub: 'Trong bảng xếp hạng', icon: <Shield size={24} />, href: '/admin/results', color: '#ffc400' },
    ];

    const quickLinks = [
        { href: '/admin/questions', label: 'Quản Lý Câu Hỏi', icon: <FileQuestion size={20} />, desc: 'Thêm, sửa, xóa, tạo bằng AI' },
        { href: '/admin/sessions', label: 'Tạo Phiên Thi', icon: <Settings size={20} />, desc: 'Module 2 và 3 realtime' },
        { href: '/admin/teams', label: 'Quản Lý Đội', icon: <Users size={20} />, desc: 'Tạo đội, thêm thành viên' },
        { href: '/admin/results', label: 'Kết Quả & BXH', icon: <Trophy size={20} />, desc: 'Vinh danh đội chiến thắng' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative">
            <FireBackgroundCanvas />
            <NavHeader />
            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-12">
                <div className="w-full max-w-6xl">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-[#ff7a00]/20 border border-[#ff7a00]/40 flex items-center justify-center">
                                <LayoutDashboard size={20} className="text-[#ff7a00]" />
                            </div>
                            <h1 className="font-orbitron font-black text-3xl text-white">ADMIN CONTROL CENTER</h1>
                        </div>
                        <p className="text-[#9a9a9a]">Quản lý toàn bộ hệ thống thi đấu STEM26</p>
                    </motion.div>

                    {/* Live session alert */}
                    {liveSession && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#22c55e] animate-pulse" />
                                <span className="text-[#22c55e] font-orbitron font-bold">PHIÊN ĐANG DIỄN RA: {liveSession.title}</span>
                            </div>
                            <Link href="/admin/sessions" className="text-[#22c55e] text-sm hover:text-white transition-colors">Quản lý →</Link>
                        </motion.div>
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {cards.map((c, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Link href={c.href}>
                                    <motion.div
                                        whileHover={{ y: -4 }}
                                        className="fire-card p-5 cursor-pointer"
                                        style={{ borderColor: `${c.color}30` }}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div style={{ color: c.color }}>{c.icon}</div>
                                            <Activity size={14} className="text-[#9a9a9a]" />
                                        </div>
                                        <div className="font-orbitron font-black text-3xl text-white">{c.value}</div>
                                        <div className="font-orbitron font-bold text-sm mt-1" style={{ color: c.color }}>{c.title}</div>
                                        <div className="text-[#9a9a9a] text-xs mt-1">{c.sub}</div>
                                    </motion.div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        {quickLinks.map((l, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                            >
                                <Link href={l.href}>
                                    <motion.div
                                        whileHover={{ y: -2, x: 4 }}
                                        className="fire-card p-5 flex items-center gap-4 cursor-pointer group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-[#ff7a00]/20 flex items-center justify-center text-[#ff7a00] group-hover:bg-[#ff7a00]/30 transition-colors">
                                            {l.icon}
                                        </div>
                                        <div>
                                            <div className="font-orbitron font-bold text-white group-hover:text-[#ff7a00] transition-colors">{l.label}</div>
                                            <div className="text-[#9a9a9a] text-sm">{l.desc}</div>
                                        </div>
                                        <Zap size={16} className="ml-auto text-[#9a9a9a] group-hover:text-[#ff7a00] transition-colors" />
                                    </motion.div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* Top Leaderboard Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="fire-card p-6"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Trophy size={18} className="text-[#ffc400]" />
                                <h3 className="font-orbitron font-bold text-white">Top Học Sinh</h3>
                            </div>
                            <Link href="/admin/results" className="text-[#ff7a00] text-sm hover:text-[#ffc400] transition-colors">Xem tất cả →</Link>
                        </div>
                        <div className="space-y-3">
                            {leaderboard.map((user, i) => (
                                <div key={user.uid} className={`scoreboard-row ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''}`}>
                                    <div className="w-7 text-center font-orbitron font-bold text-sm" style={{ color: i === 0 ? '#ffc400' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#9a9a9a' }}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 text-white font-medium ml-3">{user.displayName}</div>
                                    <div className="text-[#9a9a9a] text-sm mr-3">{user.email}</div>
                                    <div className="font-orbitron font-bold text-[#ffc400]">{user.totalPoints}</div>
                                </div>
                            ))}
                            {leaderboard.length === 0 && <p className="text-[#9a9a9a] text-center py-4">Chưa có dữ liệu</p>}
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
