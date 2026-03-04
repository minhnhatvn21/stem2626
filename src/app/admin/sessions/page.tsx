'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { getSessions, createSession, updateSession, deleteSession, getAllQuestions, getTeams, addQuestion } from '@/lib/firestore';
import { Session } from '@/types/session';
import { Question } from '@/types/question';
import { Team } from '@/types/session';
import { Plus, Play, Square, Settings, Clock, ChevronDown, ChevronUp, Trash2, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function AdminSessionsPage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '', moduleType: 'team-battle' as 'team-battle' | 'flash',
        teamIds: [] as string[],
        questionDurationSec: 20, intervalSec: 5,
        aiDifficulty: 'easy' as 'easy' | 'medium' | 'hard',
        aiCount: 10,
        isAutoAdvance: true,
        scheduledStartAt: '',
    });

    const advancingRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        if (!loading && (!appUser || appUser.role !== 'admin')) router.push('/unauthorized');
    }, [appUser, loading, router]);

    const loadData = async () => {
        const [s, q, t] = await Promise.all([getSessions(), getAllQuestions(), getTeams()]);
        setSessions(s);
        setQuestions(q.filter(q => q.status === 'published'));
        setTeams(t);
    };

    useEffect(() => { if (appUser?.role === 'admin') loadData(); }, [appUser]);

    const handleCreate = async () => {
        if (!appUser || !form.title) return;
        setSaving(true);
        try {
            // 1. Sinh câu hỏi AI
            toast.loading('Đang nhờ AI soạn câu hỏi...', { id: 'ai-gen' });
            const res = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ difficulty: form.aiDifficulty, count: form.aiCount }),
            });
            const data = await res.json();

            if (!data.questions || data.questions.length === 0) {
                toast.error('AI không thể tạo câu hỏi. Vui lòng thử lại.', { id: 'ai-gen' });
                setSaving(false);
                return;
            }

            // 2. Lưu câu hỏi vào database & lấy ID
            const qIds: string[] = [];
            for (const q of data.questions) {
                const docRef = await addQuestion({
                    ...q,
                    status: 'published',
                    createdBy: appUser.uid,
                });
                qIds.push(docRef.id);
            }
            toast.success(`Đã tạo & lưu ${qIds.length} câu hỏi mới!`, { id: 'ai-gen' });

            // 3. Tạo Session với danh sách questionIds vừa lưu
            await createSession({
                title: form.title,
                moduleType: form.moduleType,
                teamIds: form.teamIds,
                questionDurationSec: form.questionDurationSec,
                intervalSec: form.intervalSec,
                questionIds: qIds,
                code: generateCode(),
                status: 'draft',
                startAt: null,
                scheduledStartAt: form.scheduledStartAt ? new Date(form.scheduledStartAt) : null,
                isAutoAdvance: form.isAutoAdvance,
                currentQuestionIndex: 0,
                lastAdvancedAt: null,
                createdBy: appUser.uid,
            });

            toast.success('Đã tạo phiên thi!');
            setShowModal(false);

            // Reset form
            setForm({
                title: '', moduleType: 'team-battle',
                teamIds: [],
                questionDurationSec: 20, intervalSec: 5,
                aiDifficulty: 'easy', aiCount: 10,
                isAutoAdvance: true, scheduledStartAt: '',
            });

            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Lỗi khi tạo phiên thi', { id: 'ai-gen' });
        } finally { setSaving(false); }
    };

    const handleStatusChange = async (session: Session, newStatus: Session['status']) => {
        const updateData: any = { status: newStatus };
        if (newStatus === 'live') {
            updateData.lastAdvancedAt = new Date();
            updateData.startAt = session.startAt || new Date(); // set startAt if not already
        }
        await updateSession(session.id, updateData);
        if (newStatus === 'live') toast.success('🔴 Phiên thi đang LIVE!');
        if (newStatus === 'ended') toast.success('Phiên thi đã kết thúc');
        loadData();
    };

    const handleNextQuestion = async (session: Session) => {
        if (advancingRef.current[session.id]) return;
        advancingRef.current[session.id] = true;

        const next = session.currentQuestionIndex + 1;
        if (next >= session.questionIds.length) {
            await updateSession(session.id, { status: 'ended', currentQuestionIndex: next });
            toast.success('Phiên thi kết thúc!');
        } else {
            await updateSession(session.id, { currentQuestionIndex: next, lastAdvancedAt: new Date() });
            toast.success(`Câu hỏi ${next + 1}/${session.questionIds.length}`);
        }

        await loadData();
        advancingRef.current[session.id] = false;
    };

    const handleResetSession = async (session: Session) => {
        if (!confirm('Bạn có chắc muốn Khởi Tạo Lại phiên thi này? Tất cả dữ liệu của phiên thi (điểm, trạng thái) sẽ bắt đầu lại từ đầu.')) return;
        await updateSession(session.id, {
            status: 'draft',
            currentQuestionIndex: 0,
            startAt: null,
            lastAdvancedAt: null
        });
        toast.success('Đã khởi tạo lại phiên thi');
        loadData();
    };

    const handleDeleteSession = async (session: Session) => {
        if (!confirm('Bạn có chắc muốn XOÁ HOÀN TOÀN phiên thi này?')) return;
        await deleteSession(session.id);
        toast.success('Đã xoá phiên thi');
        loadData();
    };

    // Auto-advance effect
    useEffect(() => {
        const timeoutIds: ReturnType<typeof setTimeout>[] = [];
        sessions.forEach(s => {
            if (s.status === 'live' && s.isAutoAdvance && s.lastAdvancedAt) {
                const now = Date.now();
                // Handle firestore Timestamp vs normal Date
                const lastAdvTime = (s.lastAdvancedAt as any).toDate ? (s.lastAdvancedAt as any).toDate().getTime() : new Date(s.lastAdvancedAt).getTime();
                const elapsedSec = (now - lastAdvTime) / 1000;
                const totalCycle = s.questionDurationSec + s.intervalSec;
                const remainingSec = totalCycle - elapsedSec;

                if (remainingSec <= 0) {
                    if (!advancingRef.current[s.id]) handleNextQuestion(s);
                } else {
                    const tid = setTimeout(() => {
                        if (!advancingRef.current[s.id]) handleNextQuestion(s);
                    }, remainingSec * 1000);
                    timeoutIds.push(tid);
                }
            }
        });
        return () => timeoutIds.forEach(clearTimeout);
    }, [sessions]);

    const getStatusColor = (status: Session['status']) => {
        const map = { draft: '#9a9a9a', scheduled: '#ffc400', live: '#22c55e', ended: '#ff2a2a' };
        return map[status];
    };

    if (loading || !appUser) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative">
            <FireBackgroundCanvas />
            <NavHeader />
            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-12">
                <div className="w-full max-w-6xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="font-orbitron font-bold text-2xl text-white">QUẢN LÝ PHIÊN THI</h1>
                            <p className="text-[#9a9a9a] text-sm">{sessions.length} phiên thi</p>
                        </div>
                        <Button variant="fire" onClick={() => setShowModal(true)}>
                            <Plus size={16} className="mr-1" /> Tạo Phiên Mới
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {sessions.map((s, i) => (
                            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="fire-card overflow-hidden">
                                <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full" style={{ background: getStatusColor(s.status), boxShadow: `0 0 8px ${getStatusColor(s.status)}` }} />
                                        <div>
                                            <div className="font-orbitron font-bold text-white">{s.title}</div>
                                            <div className="text-[#9a9a9a] text-sm">
                                                {s.moduleType === 'team-battle' ? '🗺️ Hợp Sức' : '⚡ Nhanh Chớp'} •
                                                Mã: <span className="text-[#ff7a00] font-mono">{s.code}</span> •
                                                {s.questionIds?.length || 0} câu •
                                                {s.currentQuestionIndex + 1}/{s.questionIds?.length || 0} hiện tại
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={s.status as 'live' | 'draft' | 'ended'}>{s.status.toUpperCase()}</Badge>
                                        {expandedId === s.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </div>

                                {expandedId === s.id && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="border-t border-white/10 p-5">
                                        <div className="flex flex-wrap gap-3 mb-4">
                                            {s.status === 'draft' && (
                                                <Button variant="outline" size="sm" onClick={() => handleStatusChange(s, 'scheduled')}>
                                                    <Clock size={14} className="mr-1" /> Đặt Lịch
                                                </Button>
                                            )}
                                            {(s.status === 'draft' || s.status === 'scheduled') && (
                                                <Button variant="fire" size="sm" onClick={() => handleStatusChange(s, 'live')}>
                                                    <Play size={14} className="mr-1" /> Bắt Đầu LIVE
                                                </Button>
                                            )}
                                            {s.status === 'live' && (
                                                <>
                                                    <Button variant="fire" size="sm" onClick={() => handleNextQuestion(s)}>
                                                        <Play size={14} className="mr-1" /> Câu Tiếp
                                                    </Button>
                                                    <Button variant="danger" size="sm" onClick={() => handleStatusChange(s, 'ended')}>
                                                        <Square size={14} className="mr-1" /> Kết Thúc
                                                    </Button>
                                                </>
                                            )}
                                            <Button variant="outline" size="sm" onClick={() => handleResetSession(s)} className="border-[#ffc400]/40 text-[#ffc400] hover:bg-[#ffc400]/10">
                                                <RefreshCcw size={14} className="mr-1" /> Reset
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteSession(s)}>
                                                <Trash2 size={14} className="mr-1" /> Xoá
                                            </Button>
                                        </div>
                                        <div className="text-[#9a9a9a] text-sm space-y-1">
                                            <div>Thời gian/câu: <span className="text-white">{s.questionDurationSec}s</span></div>
                                            <div>Khoảng nghỉ: <span className="text-white">{s.intervalSec}s</span></div>
                                            <div>Số đội: <span className="text-white">{s.teamIds.length}</span></div>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                        {sessions.length === 0 && (
                            <div className="fire-card p-12 text-center text-[#9a9a9a]">
                                <Settings size={40} className="mx-auto mb-3 opacity-40" />
                                <p>Chưa có phiên thi nào</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="TẠO PHIÊN THI MỚI" size="lg">
                <div className="space-y-4">
                    <Input label="Tên Phiên Thi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="VD: Phiên thi Module 2 - Tuần 1" />
                    <Select
                        label="Loại Module"
                        value={form.moduleType}
                        onChange={e => setForm(f => ({ ...f, moduleType: e.target.value as 'team-battle' | 'flash' }))}
                        options={[{ value: 'team-battle', label: '🗺️ Hợp Sức Tác Chiến (Đội)' }, { value: 'flash', label: '⚡ Nhanh Như Chớp (Cá Nhân)' }]}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Thời gian/câu (giây)</label>
                            <input type="number" value={form.questionDurationSec} onChange={e => setForm(f => ({ ...f, questionDurationSec: +e.target.value }))} className="input-fire" min="5" max="120" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Khoảng nghỉ (giây)</label>
                            <input type="number" value={form.intervalSec} onChange={e => setForm(f => ({ ...f, intervalSec: +e.target.value }))} className="input-fire" min="0" max="30" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Cấp độ AI sinh câu hỏi</label>
                            <Select
                                value={form.aiDifficulty}
                                onChange={e => setForm(f => ({ ...f, aiDifficulty: e.target.value as any }))}
                                options={[{ value: 'easy', label: 'Dễ' }, { value: 'medium', label: 'Trung Bình' }, { value: 'hard', label: 'Khó' }]}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Số lượng câu hỏi</label>
                            <input type="number" value={form.aiCount} onChange={e => setForm(f => ({ ...f, aiCount: +e.target.value }))} className="input-fire" min="1" max="50" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Tự Động Chuyển Bật/Tắt</label>
                            <label className="flex items-center gap-2 cursor-pointer mt-3">
                                <input type="checkbox" checked={form.isAutoAdvance} onChange={e => setForm(f => ({ ...f, isAutoAdvance: e.target.checked }))} className="accent-[#ff7a00] w-4 h-4" />
                                <span className="text-white text-sm">Bật đếm ngược (Auto-Advance)</span>
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Lịch Mở (Không Bắt Buộc)</label>
                            <input type="datetime-local" value={form.scheduledStartAt} onChange={e => setForm(f => ({ ...f, scheduledStartAt: e.target.value }))} className="input-fire w-full" />
                        </div>
                    </div>
                    {form.moduleType === 'team-battle' && (
                        <div>
                            <label className="block text-xs font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Chọn Đội ({form.teamIds.length} đã chọn)</label>
                            <div className="space-y-2 border border-[#ff7a00]/20 rounded-lg p-3">
                                {teams.map(t => (
                                    <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded-lg">
                                        <input
                                            type="checkbox"
                                            checked={form.teamIds.includes(t.id)}
                                            onChange={e => setForm(f => ({ ...f, teamIds: e.target.checked ? [...f.teamIds, t.id] : f.teamIds.filter(id => id !== t.id) }))}
                                            className="accent-[#ff7a00]"
                                        />
                                        <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                                        <span className="text-white text-sm">{t.name}</span>
                                    </label>
                                ))}
                                {teams.length === 0 && <p className="text-[#9a9a9a] text-sm">Chưa có đội nào. Tạo đội trước.</p>}
                            </div>
                        </div>
                    )}
                    <Button variant="fire" onClick={handleCreate} loading={saving} className="w-full">
                        Tạo Phiên Thi
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
