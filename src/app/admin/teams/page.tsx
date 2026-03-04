'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavHeader } from '@/components/ui/NavHeader';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { getTeams, createTeam, updateTeam, deleteTeam, getLeaderboard } from '@/lib/firestore';
import { Team } from '@/types/session';
import { AppUser } from '@/types/user';
import { Users, Plus, Trash2, Edit, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#ff2a2a', '#4a9eff', '#22c55e', '#a855f7', '#f97316', '#06b6d4'];

function generateCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export default function AdminTeamsPage() {
    const { appUser, loading } = useAuth();
    const router = useRouter();
    const [teams, setTeams] = useState<Team[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', color: COLORS[0] });

    useEffect(() => {
        if (!loading && (!appUser || appUser.role !== 'admin')) router.push('/unauthorized');
    }, [appUser, loading, router]);

    const loadData = async () => {
        const [t, u] = await Promise.all([getTeams(), getLeaderboard(50)]);
        setTeams(t);
        setUsers(u);
    };

    useEffect(() => { if (appUser?.role === 'admin') loadData(); }, [appUser]);

    const handleSave = async () => {
        if (!appUser || !form.name) return;
        setSaving(true);
        try {
            if (editingTeam) {
                await updateTeam(editingTeam.id, { name: form.name, color: form.color });
                toast.success('Đã cập nhật đội');
            } else {
                await createTeam({ name: form.name, color: form.color, code: generateCode(), memberIds: [] });
                toast.success('Đã tạo đội mới!');
            }
            setShowModal(false);
            setEditingTeam(null);
            loadData();
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa đội này?')) return;
        await deleteTeam(id);
        toast.success('Đã xóa đội');
        loadData();
    };

    const handleAddMember = async (teamId: string, userId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        if (team.memberIds.includes(userId)) { toast.error('Đã trong đội này'); return; }
        await updateTeam(teamId, { memberIds: [...team.memberIds, userId] });
        toast.success('Đã thêm thành viên');
        loadData();
    };

    const handleRemoveMember = async (teamId: string, userId: string) => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        await updateTeam(teamId, { memberIds: team.memberIds.filter(id => id !== userId) });
        toast.success('Đã xóa thành viên');
        loadData();
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
                            <h1 className="font-orbitron font-bold text-2xl text-white">QUẢN LÝ ĐỘI THI</h1>
                            <p className="text-[#9a9a9a] text-sm">{teams.length} đội</p>
                        </div>
                        <Button variant="fire" onClick={() => { setEditingTeam(null); setForm({ name: '', color: COLORS[0] }); setShowModal(true); }}>
                            <Plus size={16} className="mr-1" /> Tạo Đội Mới
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {teams.map((team, i) => {
                            const members = users.filter(u => team.memberIds.includes(u.uid));
                            const availableUsers = users.filter(u => !team.memberIds.includes(u.uid));
                            return (
                                <motion.div key={team.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="fire-card p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${team.color}30`, border: `2px solid ${team.color}`, boxShadow: `0 0 15px ${team.color}44` }}>
                                                <Users size={18} style={{ color: team.color }} />
                                            </div>
                                            <div>
                                                <div className="font-orbitron font-bold text-white">{team.name}</div>
                                                <div className="text-[#9a9a9a] text-xs">Mã: <span className="font-mono text-[#ff7a00]">{team.code}</span> • {members.length} thành viên</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingTeam(team); setForm({ name: team.name, color: team.color }); setShowModal(true); }} className="p-2 rounded-lg text-[#ff7a00] bg-[#ff7a00]/10 hover:bg-[#ff7a00]/20 transition-colors">
                                                <Edit size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(team.id)} className="p-2 rounded-lg text-[#ff2a2a] bg-[#ff2a2a]/10 hover:bg-[#ff2a2a]/20 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Members */}
                                    <div className="space-y-2 mb-3">
                                        {members.map(m => (
                                            <div key={m.uid} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                                <span className="text-white text-sm">{m.displayName}</span>
                                                <button onClick={() => handleRemoveMember(team.id, m.uid)} className="text-[#ff2a2a] hover:text-white transition-colors text-xs">Xóa</button>
                                            </div>
                                        ))}
                                        {members.length === 0 && <p className="text-[#9a9a9a] text-sm text-center py-2">Chưa có thành viên</p>}
                                    </div>

                                    {/* Add member */}
                                    <div className="flex gap-2">
                                        <select
                                            className="input-fire py-2 text-sm flex-1"
                                            onChange={e => { if (e.target.value) { handleAddMember(team.id, e.target.value); e.target.value = ''; } }}
                                        >
                                            <option value="">+ Thêm thành viên...</option>
                                            {availableUsers.map(u => <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>)}
                                        </select>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {teams.length === 0 && (
                            <div className="col-span-2 fire-card p-12 text-center text-[#9a9a9a]">
                                <Users size={40} className="mx-auto mb-3 opacity-40" />
                                <p>Chưa có đội nào</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTeam ? 'SỬA ĐỘI' : 'TẠO ĐỘI MỚI'}>
                <div className="space-y-4">
                    <Input label="Tên Đội" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Đội Rồng Lửa" />
                    <div>
                        <label className="block text-xs font-medium text-[#9a9a9a] mb-3 font-orbitron uppercase">Màu Đội</label>
                        <div className="flex gap-3">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setForm(f => ({ ...f, color: c }))}
                                    className="w-10 h-10 rounded-full transition-transform"
                                    style={{ background: c, transform: form.color === c ? 'scale(1.2)' : 'scale(1)', boxShadow: form.color === c ? `0 0 15px ${c}` : 'none' }}
                                />
                            ))}
                        </div>
                    </div>
                    <Button variant="fire" onClick={handleSave} loading={saving} className="w-full">
                        {editingTeam ? 'Cập Nhật Đội' : 'Tạo Đội'}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
