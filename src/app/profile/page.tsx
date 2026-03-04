'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { updateUser, getPracticeAttempts, getLeaderboard } from '@/lib/firestore';
import { PracticeAttempt } from '@/types/answer';
import { User, Star, Target, Flame, Trophy, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();
    const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
    const [rank, setRank] = useState<number>(0);
    const [displayName, setDisplayName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!loading && !appUser) router.push('/auth/login');
        if (appUser) setDisplayName(appUser.displayName);
    }, [appUser, loading, router]);

    useEffect(() => {
        if (!appUser) return;
        getPracticeAttempts(appUser.uid).then(setAttempts);
        getLeaderboard(100).then(lb => {
            const idx = lb.findIndex(u => u.uid === appUser.uid);
            setRank(idx + 1);
        });
    }, [appUser]);

    const handleSave = async () => {
        if (!appUser || !displayName.trim()) return;
        setSaving(true);
        try {
            await updateUser(appUser.uid, { displayName: displayName.trim() });
            toast.success('Đã cập nhật hồ sơ!');
        } catch {
            toast.error('Lỗi cập nhật hồ sơ');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !appUser) {
        return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" /></div>;
    }

    const correctCount = attempts.filter(a => a.isCorrect).length;
    const accuracy = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative">
            <FireBackgroundCanvas />
            <NavHeader />
            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
                    {/* Avatar */}
                    <div className="text-center mb-8">
                        <div className="inline-flex w-24 h-24 rounded-full bg-[#ff7a00]/20 border-2 border-[#ff7a00]/60 items-center justify-center mb-4"
                            style={{ boxShadow: '0 0 30px rgba(255,122,0,0.4)' }}>
                            <User size={48} className="text-[#ff7a00]" />
                        </div>
                        <h1 className="font-orbitron font-black text-2xl text-white">{appUser.displayName}</h1>
                        <p className="text-[#9a9a9a] text-sm mt-1">
                            {appUser.role === 'admin' ? '⚡ Quản Trị Viên' : '🔥 Chiến Binh'}
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {[
                            { icon: <Star size={18} />, label: 'Tổng Điểm', value: appUser.totalPoints, color: '#ffc400' },
                            { icon: <Target size={18} />, label: 'Độ Chính Xác', value: `${accuracy}%`, color: '#22c55e' },
                            { icon: <Flame size={18} />, label: 'Số Lần Luyện', value: attempts.length, color: '#ff7a00' },
                            { icon: <Trophy size={18} />, label: 'Hạng BXH', value: rank > 0 ? `#${rank}` : '--', color: '#ff2a2a' },
                        ].map((s, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className="fire-card p-4 text-center">
                                <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                                <div className="font-orbitron font-bold text-xl text-white">{s.value}</div>
                                <div className="text-[#9a9a9a] text-xs mt-0.5">{s.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Edit Profile */}
                    <div className="fire-card p-6 mb-6">
                        <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                            <User size={16} className="text-[#ff7a00]" /> Chỉnh Sửa Hồ Sơ
                        </h3>
                        <div className="space-y-4">
                            <Input label="Tên Hiển Thị" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Tên chiến binh của bạn" />
                            <div>
                                <label className="block text-xs font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Email</label>
                                <input value={appUser.email} disabled className="input-fire opacity-50 cursor-not-allowed" />
                            </div>
                            <Button variant="fire" onClick={handleSave} loading={saving} className="flex items-center gap-2">
                                <Save size={16} /> Lưu Thay Đổi
                            </Button>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="fire-card p-6 mb-6">
                        <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                            <Shield size={16} className="text-[#ff7a00]" /> Thông Tin Tài Khoản
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-[#9a9a9a]">Vai trò</span>
                                <span className="text-white font-medium">{appUser.role === 'admin' ? 'Quản Trị Viên' : 'Học Sinh'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#9a9a9a]">Ngày tạo</span>
                                <span className="text-white font-medium">
                                    {appUser.createdAt ? new Date(appUser.createdAt).toLocaleDateString('vi-VN') : '--'}
                                </span>
                            </div>
                            {appUser.teamId && (
                                <div className="flex justify-between">
                                    <span className="text-[#9a9a9a]">Đội thi</span>
                                    <span className="text-[#ff7a00] font-medium">{appUser.teamId}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Practice History */}
                    <div className="fire-card p-6">
                        <h3 className="font-orbitron font-bold text-white mb-4 flex items-center gap-2">
                            <Flame size={16} className="text-[#ff7a00]" /> Lịch Sử Luyện Tập
                            <span className="ml-auto text-[#9a9a9a] text-xs font-normal">{attempts.length} lần</span>
                        </h3>
                        {attempts.length === 0 ? (
                            <p className="text-[#9a9a9a] text-sm text-center py-6">Chưa có lần luyện tập nào</p>
                        ) : (
                            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                                {attempts.map((a, i) => (
                                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${a.isCorrect ? 'bg-[#22c55e]/8 border border-[#22c55e]/15' : 'bg-[#ff2a2a]/8 border border-[#ff2a2a]/15'}`}>
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.isCorrect ? 'bg-[#22c55e]' : 'bg-[#ff2a2a]'}`} />
                                        <span className={`text-sm font-medium ${a.isCorrect ? 'text-[#22c55e]' : 'text-[#ff2a2a]'}`}>
                                            {a.isCorrect ? '✓ Đúng' : '✗ Sai'}
                                        </span>
                                        {a.difficulty && (
                                            <span className="text-[#9a9a9a] text-xs px-2 py-0.5 rounded-full bg-white/5">
                                                {a.difficulty === 'easy' ? 'Dễ' : a.difficulty === 'medium' ? 'Vừa' : 'Khó'}
                                            </span>
                                        )}
                                        <span className="text-[#9a9a9a] text-xs ml-auto flex-shrink-0">
                                            {(a.timeSpentMs / 1000).toFixed(1)}s
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
