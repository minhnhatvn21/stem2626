'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { getAllQuestions, addQuestion, updateQuestion, deleteQuestion } from '@/lib/firestore';
import { generateQuestionsAI } from '@/lib/ai-question-generator';
import { Question, Difficulty, AIGeneratedQuestion } from '@/types/question';
import { demoQuestions } from '@/data/demoQuestions';
import { Plus, Trash2, Edit, Zap, Check, X, RefreshCw, Eye, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const DIFFICULTY_OPTIONS = [
    { value: 'easy', label: 'Dễ' },
    { value: 'medium', label: 'Vừa' },
    { value: 'hard', label: 'Khó' },
];

const TOPIC_OPTIONS = [
    { value: 'solar', label: 'Điện Mặt Trời' },
    { value: 'wind', label: 'Điện Gió' },
    { value: 'hydro', label: 'Thủy Điện' },
    { value: 'energy_saving', label: 'Tiết Kiệm Điện' },
    { value: 'general', label: 'Tổng Hợp' },
    { value: 'bioenergy', label: 'Sinh Khối' },
    { value: 'geothermal', label: 'Địa Nhiệt' },
];

export default function AdminQuestionsPage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [editingQ, setEditingQ] = useState<Question | null>(null);
    const [aiGenerated, setAiGenerated] = useState<AIGeneratedQuestion[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

    // AI form
    const [aiTopic, setAiTopic] = useState('Năng lượng mặt trời');
    const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('easy');
    const [aiCount, setAiCount] = useState(5);

    // Manual form
    const [form, setForm] = useState({
        question: '', options: ['', '', '', ''], correctIndex: 0,
        explanation: '', difficulty: 'easy' as Difficulty, topic: 'general', status: 'draft' as 'draft' | 'published',
    });

    useEffect(() => {
        if (!loading && (!appUser || appUser.role !== 'admin')) router.push('/unauthorized');
    }, [appUser, loading, router]);

    const loadQuestions = async () => {
        const qs = await getAllQuestions();
        setQuestions(qs);
    };

    useEffect(() => { if (appUser?.role === 'admin') loadQuestions(); }, [appUser]);

    const handleSeedDemo = async () => {
        if (!appUser) return;
        setSaving(true);
        try {
            for (const q of demoQuestions) {
                await addQuestion({ ...q, createdBy: appUser.uid });
            }
            toast.success(`Đã thêm ${demoQuestions.length} câu hỏi mẫu!`);
            loadQuestions();
        } finally { setSaving(false); }
    };

    const handleGenerateAI = async () => {
        setAiLoading(true);
        try {
            const result = await generateQuestionsAI({ topic: aiTopic, difficulty: aiDifficulty, count: aiCount });
            setAiGenerated(result);
            toast.success(`Đã tạo ${result.length} câu hỏi!`);
        } catch (e) {
            toast.error('Lỗi tạo câu hỏi AI');
        } finally { setAiLoading(false); }
    };

    const handleSaveAI = async (q: AIGeneratedQuestion) => {
        if (!appUser) return;
        await addQuestion({ ...q, moduleType: 'all', source: 'ai', status: 'draft', createdBy: appUser.uid });
        toast.success('Đã lưu vào ngân hàng câu hỏi (cần duyệt)');
        loadQuestions();
    };

    const handleSaveAllAI = async () => {
        if (!appUser) return;
        setSaving(true);
        for (const q of aiGenerated) {
            await addQuestion({ ...q, moduleType: 'all', source: 'ai', status: 'draft', createdBy: appUser.uid });
        }
        toast.success(`Đã lưu ${aiGenerated.length} câu hỏi`);
        setAiGenerated([]);
        setShowAIModal(false);
        loadQuestions();
        setSaving(false);
    };

    const handlePublish = async (q: Question) => {
        await updateQuestion(q.id, { status: q.status === 'published' ? 'draft' : 'published' });
        toast.success(q.status === 'published' ? 'Đã ẩn câu hỏi' : 'Đã xuất bản câu hỏi!');
        loadQuestions();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa câu hỏi này?')) return;
        await deleteQuestion(id);
        toast.success('Đã xóa');
        loadQuestions();
    };

    const handleSaveManual = async () => {
        if (!appUser || !form.question) return;
        setSaving(true);
        try {
            if (editingQ) {
                await updateQuestion(editingQ.id, { ...form });
                toast.success('Đã cập nhật câu hỏi');
            } else {
                await addQuestion({ ...form, moduleType: 'all', source: 'admin', createdBy: appUser.uid });
                toast.success('Đã thêm câu hỏi');
            }
            setShowAddModal(false);
            setEditingQ(null);
            loadQuestions();
        } finally { setSaving(false); }
    };

    const filteredQ = questions.filter(q => filter === 'all' ? true : q.status === filter);

    if (loading || !appUser) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] relative">
            <FireBackgroundCanvas />
            <NavHeader />
            <main className="relative z-10 w-full flex flex-col items-center px-4 pt-32 pb-12">
                <div className="w-full max-w-6xl">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                        <div>
                            <h1 className="font-orbitron font-bold text-2xl text-white">NGÂN HÀNG CÂU HỎI</h1>
                            <p className="text-[#9a9a9a] text-sm">{questions.length} câu hỏi</p>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <Button variant="outline" size="sm" onClick={handleSeedDemo} loading={saving}>
                                <FileText size={16} className="mr-1" /> Seed Demo
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowAIModal(true)} className="border-[#ffc400]/50 text-[#ffc400]">
                                <Zap size={16} className="mr-1" /> Tạo Bằng AI
                            </Button>
                            <Button variant="fire" size="sm" onClick={() => { setEditingQ(null); setForm({ question: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', difficulty: 'easy', topic: 'general', status: 'draft' }); setShowAddModal(true); }}>
                                <Plus size={16} className="mr-1" /> Thêm Câu Hỏi
                            </Button>
                        </div>
                    </div>

                    {/* Filter */}
                    <div className="flex gap-2 mb-5">
                        {(['all', 'published', 'draft'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-[#ff7a00] text-white' : 'bg-white/5 text-[#9a9a9a] hover:bg-white/10'}`}
                            >
                                {f === 'all' ? 'Tất Cả' : f === 'published' ? '✓ Đã Xuất Bản' : '○ Nháp'} ({questions.filter(q => f === 'all' ? true : q.status === f).length})
                            </button>
                        ))}
                    </div>

                    {/* Questions List */}
                    <div className="space-y-3">
                        {filteredQ.map((q, i) => (
                            <motion.div
                                key={q.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="fire-card p-4 flex items-start gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <Badge variant={q.difficulty as 'easy' | 'medium' | 'hard'}>{q.difficulty === 'easy' ? 'DỄ' : q.difficulty === 'medium' ? 'VỪA' : 'KHÓ'}</Badge>
                                        <Badge variant={q.status === 'published' ? 'live' : 'draft'}>{q.status === 'published' ? 'PUBLISHED' : 'NHÁP'}</Badge>
                                        <span className="text-[#9a9a9a] text-xs">{q.topic}</span>
                                        {q.source === 'ai' && <span className="text-[#ffc400] text-xs">⚡ AI</span>}
                                    </div>
                                    <p className="text-white font-medium text-sm line-clamp-2">{q.question}</p>
                                    <div className="flex gap-4 mt-2">
                                        {q.options.slice(0, 2).map((opt, j) => (
                                            <span key={j} className={`text-xs ${j === q.correctIndex ? 'text-green-400 font-bold' : 'text-[#9a9a9a]'}`}>
                                                {String.fromCharCode(65 + j)}. {opt.slice(0, 30)}...
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handlePublish(q)} className={`p-2 rounded-lg transition-colors ${q.status === 'published' ? 'text-green-400 bg-green-400/10 hover:bg-green-400/20' : 'text-[#9a9a9a] bg-white/5 hover:bg-white/10'}`} title={q.status === 'published' ? 'Ẩn' : 'Xuất bản'}>
                                        <Eye size={16} />
                                    </button>
                                    <button onClick={() => { setEditingQ(q); setForm({ question: q.question, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation, difficulty: q.difficulty, topic: q.topic, status: q.status }); setShowAddModal(true); }} className="p-2 rounded-lg text-[#ff7a00] bg-[#ff7a00]/10 hover:bg-[#ff7a00]/20 transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(q.id)} className="p-2 rounded-lg text-[#ff2a2a] bg-[#ff2a2a]/10 hover:bg-[#ff2a2a]/20 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                        {filteredQ.length === 0 && (
                            <div className="fire-card p-12 text-center text-[#9a9a9a]">
                                <FileText size={40} className="mx-auto mb-3 opacity-40" />
                                <p>Chưa có câu hỏi nào</p>
                                <p className="text-sm mt-1">Nhấn &quot;Seed Demo&quot; để thêm câu hỏi mẫu</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Add/Edit Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingQ ? 'SỬA CÂU HỎI' : 'THÊM CÂU HỎI MỚI'} size="lg">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Câu Hỏi</label>
                        <textarea
                            className="input-fire resize-none h-24"
                            value={form.question}
                            onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                            placeholder="Nhập câu hỏi..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Các Đáp Án (✓ = Đúng)</label>
                        {form.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2 mb-2">
                                <button
                                    onClick={() => setForm(f => ({ ...f, correctIndex: i }))}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${form.correctIndex === i ? 'bg-green-500 text-white' : 'bg-white/10 text-[#9a9a9a]'}`}
                                >
                                    {String.fromCharCode(65 + i)}
                                </button>
                                <input
                                    className="input-fire flex-1 py-2"
                                    value={opt}
                                    onChange={e => setForm(f => ({ ...f, options: f.options.map((o, j) => j === i ? e.target.value : o) }))}
                                    placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Độ Khó" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))} options={DIFFICULTY_OPTIONS} />
                        <Select label="Chủ Đề" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} options={TOPIC_OPTIONS} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Giải Thích</label>
                        <textarea
                            className="input-fire resize-none h-20"
                            value={form.explanation}
                            onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                            placeholder="Giải thích đáp án đúng..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="fire" onClick={handleSaveManual} loading={saving} className="flex-1">
                            {editingQ ? 'Cập Nhật' : 'Lưu Câu Hỏi'}
                        </Button>
                        {!editingQ && (
                            <Button variant="outline" onClick={() => setForm(f => ({ ...f, status: 'published' }))}>
                                Lưu & Xuất Bản
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* AI Generator Modal */}
            <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="TẠO CÂU HỎI BẰNG AI ⚡" size="xl">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <Input label="Chủ Đề" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="VD: Điện mặt trời, Điện gió..." />
                        </div>
                        <Select label="Độ Khó" value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value as Difficulty)} options={DIFFICULTY_OPTIONS} />
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase">Số Câu</label>
                            <input type="number" min="1" max="20" value={aiCount} onChange={e => setAiCount(+e.target.value)} className="input-fire" />
                        </div>
                        <Button variant="fire" onClick={handleGenerateAI} loading={aiLoading} className="flex items-center gap-2">
                            <Zap size={16} /> Tạo Câu Hỏi
                        </Button>
                    </div>

                    {aiGenerated.length > 0 && (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-[#22c55e] font-orbitron font-bold">✓ Đã tạo {aiGenerated.length} câu hỏi</p>
                                <Button variant="fire" size="sm" onClick={handleSaveAllAI} loading={saving}>
                                    Lưu Tất Cả
                                </Button>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {aiGenerated.map((q, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                        <p className="text-white font-medium text-sm mb-2">{i + 1}. {q.question}</p>
                                        <div className="grid grid-cols-2 gap-1 mb-2">
                                            {q.options.map((opt, j) => (
                                                <div key={j} className={`text-xs p-1 rounded ${j === q.correctIndex ? 'text-green-400 font-bold' : 'text-[#9a9a9a]'}`}>
                                                    {String.fromCharCode(65 + j)}. {opt}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[#9a9a9a] text-xs italic">{q.explanation}</p>
                                        <button onClick={() => handleSaveAI(q)} className="mt-2 text-[#ff7a00] text-xs hover:text-[#ffc400] transition-colors">
                                            + Lưu câu này
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
