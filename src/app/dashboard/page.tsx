'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { getPracticeAttempts, getLeaderboard } from '@/lib/firestore';
import { PracticeAttempt } from '@/types/answer';
import { AppUser } from '@/types/user';
import { Shield, Users, Zap, Trophy, Target, Flame, Star, ChevronRight, Medal, Swords } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();
    const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
    const [leaderboard, setLeaderboard] = useState<AppUser[]>([]);

    useEffect(() => {
        if (!loading && !appUser) router.push('/auth/login');
        if (!loading && appUser?.role === 'admin') router.push('/admin');
    }, [appUser, loading, router]);

    useEffect(() => {
        if (!appUser) return;
        getPracticeAttempts(appUser.uid).then(setAttempts).catch(() => { });
        getLeaderboard(5).then(setLeaderboard).catch(() => { });
    }, [appUser]);

    if (loading || !appUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const correctCount = attempts.filter(a => a.isCorrect).length;
    const accuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;
    const myRank = leaderboard.findIndex(u => u.uid === appUser.uid) + 1;

    const stats = [
        { icon: <Star size={22} />, label: 'Tổng Điểm', value: appUser.totalPoints, color: '#ffc400' },
        { icon: <Target size={22} />, label: 'Chính Xác', value: `${accuracy}%`, color: '#22c55e' },
        { icon: <Flame size={22} />, label: 'Lần Luyện', value: attempts.length, color: '#ff7a00' },
        { icon: <Trophy size={22} />, label: 'Hạng BXH', value: myRank > 0 ? `#${myRank}` : '--', color: '#ff2a2a' },
    ];

    const modules = [
        {
            icon: <Shield size={32} />,
            title: 'CHIẾN BINH',
            subtitle: 'Luyện tập cá nhân',
            desc: 'Câu hỏi trắc nghiệm theo cấp độ, bấm giờ 20 giây, tích lũy điểm',
            href: '/battle/warrior',
            color: '#ff2a2a',
            tag: 'SẴN SÀNG',
            tagColor: '#22c55e',
        },
        {
            icon: <Users size={32} />,
            title: 'HỢP SỨC',
            subtitle: 'Chiến đấu theo đội',
            desc: 'Tranh chiếm bản đồ lãnh thổ theo thời gian thực cùng đội của bạn',
            href: '/battle/team-battle',
            color: '#4a9eff',
            tag: 'THEO ĐỘI',
            tagColor: '#4a9eff',
        },
        {
            icon: <Zap size={32} />,
            title: 'NHANH CHỚP',
            subtitle: 'Tốc độ phản xạ',
            desc: 'Ai trả lời đúng và nhanh nhất trong phòng thi sẽ giành điểm cao nhất',
            href: '/battle/flash',
            color: '#ffc400',
            tag: 'PHẢN XẠ',
            tagColor: '#ffc400',
        },
        {
            icon: <Swords size={32} />,
            title: 'THÁCH ĐẤU',
            subtitle: '1v1 Trực tiếp',
            desc: 'Đối đầu trực tiếp 1v1 với bạn bè thông qua mã phòng để giành điểm',
            href: '/battle/duel',
            color: '#a855f7',
            tag: 'ĐỐI KHÁNG',
            tagColor: '#a855f7',
        },
    ];

    const rankColors = ['#ffc400', '#c0c0c0', '#cd7f32'];

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative">
            <FireBackgroundCanvas />
            <NavHeader />

            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-16">
                <div className="w-full max-w-6xl">

                    {/* ── Welcome Banner ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                        <div>
                            <h1 className="font-vn font-black text-3xl md:text-4xl text-white mb-1">
                                Chào, <span className="fire-gradient-text">{appUser.displayName}</span>! 👋
                            </h1>
                            <p className="text-[#9a9a9a] text-sm">Sẵn sàng chiến đấu hôm nay? ⚡</p>
                        </div>
                        <Link href="/profile">
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#ff7a00]/40 transition-all cursor-pointer">
                                <div className="w-10 h-10 rounded-full bg-[#ff7a00]/20 border border-[#ff7a00]/40 flex items-center justify-center">
                                    <Star size={18} className="text-[#ff7a00]" />
                                </div>
                                <div>
                                    <div className="text-white text-sm font-semibold">{appUser.totalPoints} điểm</div>
                                    <div className="text-[#9a9a9a] text-xs">Xem hồ sơ</div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* ── Stats ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        {stats.map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="fire-card p-4 flex items-center gap-4"
                            >
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${s.color}20`, color: s.color }}>
                                    {s.icon}
                                </div>
                                <div>
                                    <div className="font-orbitron font-black text-xl text-white leading-none">{s.value}</div>
                                    <div className="text-[#9a9a9a] text-xs mt-1">{s.label}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* ── Module Cards ── */}
                    <div className="mb-8">
                        <h2 className="font-vn font-bold text-lg text-white mb-4 flex items-center gap-2">
                            <Flame size={18} className="text-[#ff7a00]" /> Chọn Chiến Trường
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {modules.map((m, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 + i * 0.1 }}
                                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                >
                                    <Link href={m.href} className="block h-full">
                                        <div className="fire-card p-6 cursor-pointer group h-full flex flex-col relative overflow-hidden">
                                            {/* Top accent line */}
                                            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
                                                style={{ background: `linear-gradient(90deg, ${m.color}, transparent)` }} />

                                            {/* Icon + tag row */}
                                            <div className="flex items-center justify-between mb-5">
                                                <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                                                    style={{ background: `${m.color}18`, color: m.color, boxShadow: `0 0 20px ${m.color}30` }}>
                                                    {m.icon}
                                                </div>
                                                <span className="text-xs font-semibold px-2 py-1 rounded-full font-vn"
                                                    style={{ background: `${m.tagColor}15`, color: m.tagColor, border: `1px solid ${m.tagColor}30` }}>
                                                    {m.tag}
                                                </span>
                                            </div>

                                            {/* Title & desc */}
                                            <div className="flex-1">
                                                <h3 className="font-vn font-bold text-xl text-white mb-1 group-hover:text-[#ff7a00] transition-colors">
                                                    {m.title}
                                                </h3>
                                                <p className="text-[#ff7a00]/70 text-xs mb-2 font-medium">{m.subtitle}</p>
                                                <p className="text-[#9a9a9a] text-sm leading-relaxed">{m.desc}</p>
                                            </div>

                                            {/* CTA */}
                                            <div className="mt-5 flex items-center gap-1 text-sm font-semibold transition-all"
                                                style={{ color: m.color }}>
                                                Vào chiến trường
                                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* ── Bottom: Leaderboard + History ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Leaderboard */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55 }}
                            className="fire-card p-6"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <Trophy size={18} className="text-[#ffc400]" />
                                <h3 className="font-vn font-bold text-base text-white">BXH Tổng Điểm</h3>
                            </div>
                            <div className="space-y-2">
                                {leaderboard.length === 0 && (
                                    <p className="text-[#9a9a9a] text-center py-6 text-sm">Chưa có dữ liệu</p>
                                )}
                                {leaderboard.map((user, i) => (
                                    <div key={user.uid}
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${user.uid === appUser.uid ? 'bg-[#ff7a00]/10 border border-[#ff7a00]/20' : 'bg-white/3 hover:bg-white/5'}`}>
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-orbitron font-bold text-sm"
                                            style={{
                                                background: i < 3 ? `${rankColors[i]}20` : 'rgba(255,255,255,0.05)',
                                                color: i < 3 ? rankColors[i] : '#9a9a9a'
                                            }}>
                                            {i < 3 ? <Medal size={14} /> : i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white text-sm font-medium truncate">
                                                {user.displayName}
                                                {user.uid === appUser.uid && <span className="text-[#ff7a00] ml-1 text-xs">(Bạn)</span>}
                                            </div>
                                        </div>
                                        <div className="font-orbitron font-bold text-sm flex-shrink-0"
                                            style={{ color: i < 3 ? rankColors[i] : '#9a9a9a' }}>
                                            {user.totalPoints}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Practice History */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.65 }}
                            className="fire-card p-6"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <Flame size={18} className="text-[#ff7a00]" />
                                <h3 className="font-vn font-bold text-base text-white">Lịch Sử Luyện Tập</h3>
                            </div>
                            {attempts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 gap-4">
                                    <div className="text-5xl opacity-30">🎯</div>
                                    <p className="text-[#9a9a9a] text-sm">Chưa có lần luyện tập nào</p>
                                    <Link href="/battle/warrior">
                                        <Button variant="fire" size="sm">Luyện Tập Ngay</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {attempts.slice(0, 7).map((a, i) => (
                                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${a.isCorrect ? 'bg-[#22c55e]/8 border border-[#22c55e]/15' : 'bg-[#ff2a2a]/8 border border-[#ff2a2a]/15'}`}>
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.isCorrect ? 'bg-[#22c55e]' : 'bg-[#ff2a2a]'}`} />
                                            <span className={`text-sm font-medium ${a.isCorrect ? 'text-[#22c55e]' : 'text-[#ff2a2a]'}`}>
                                                {a.isCorrect ? '✓ Đúng' : '✗ Sai'}
                                            </span>
                                            <span className="text-[#9a9a9a] text-xs ml-auto flex-shrink-0">
                                                {(a.timeSpentMs / 1000).toFixed(1)}s
                                            </span>
                                        </div>
                                    ))}
                                    <div className="text-center pt-2">
                                        <Link href="/profile" className="text-[#ff7a00] text-xs hover:text-[#ffc400] transition-colors">
                                            Xem tất cả →
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </main>
        </div>
    );
}
