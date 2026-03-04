'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Flame, Shield, Lock, Mail, User, Key } from 'lucide-react';
import toast from 'react-hot-toast';

// Secret passphrase to create admin accounts
const ADMIN_SECRET = 'STEM26ADMIN2025';

export default function SetupPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        displayName: '',
        email: '',
        password: '',
        secret: '',
    });
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.secret !== ADMIN_SECRET) {
            toast.error('Mã bí mật không đúng!');
            return;
        }
        if (!form.displayName || !form.email || !form.password) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        if (form.password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);
        try {
            let userResult;
            try {
                // Try creating first
                userResult = await createUserWithEmailAndPassword(auth, form.email, form.password);
                await updateProfile(userResult.user, { displayName: form.displayName });
            } catch (createErr: any) {
                if (createErr.code === 'auth/email-already-in-use') {
                    // Turn an existing student into an admin
                    toast.loading('Tài khoản đã tồn tại, đang đăng nhập để cấp quyền Admin...');
                    userResult = await signInWithEmailAndPassword(auth, form.email, form.password);
                    if (form.displayName) {
                        await updateProfile(userResult.user, { displayName: form.displayName });
                    }
                    toast.dismiss();
                } else {
                    throw createErr;
                }
            }

            // Write/Merge Firestore user doc with role: "admin"
            await setDoc(doc(db, 'users', userResult.user.uid), {
                uid: userResult.user.uid,
                email: form.email,
                displayName: form.displayName || userResult.user.displayName,
                role: 'admin',
                totalPoints: 0,
                createdAt: serverTimestamp(),
            }, { merge: true });

            setDone(true);
            toast.success('Tài khoản admin đã sẵn sàng! 🎉');
        } catch (err: unknown) {
            console.error(err);
            toast.dismiss();
            const code = (err as { code?: string })?.code ?? '';
            if (code === 'auth/weak-password') {
                toast.error('Mật khẩu quá yếu');
            } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                toast.error('Mật khẩu không đúng cho tài khoản này');
            } else {
                toast.error(`Lỗi: ${code || 'Không xác định'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative">
            {/* Background grid */}
            <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'linear-gradient(#ff7a00 1px, transparent 1px), linear-gradient(90deg, #ff7a00 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md z-10"
            >
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-4">
                        <Flame size={36} className="text-[#ff7a00]" style={{ filter: 'drop-shadow(0 0 8px #ff7a00)' }} />
                        <span className="font-orbitron font-black text-2xl fire-gradient-text">STEM26</span>
                    </Link>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff2a2a]/10 border border-[#ff2a2a]/30 text-[#ff2a2a] text-xs font-semibold mb-3">
                        <Shield size={12} /> ADMIN SETUP
                    </div>
                    <h1 className="font-vn font-bold text-2xl text-white">TẠO TÀI KHOẢN QUẢN TRỊ</h1>
                    <p className="text-[#9a9a9a] mt-2 text-sm">Nhập mã bí mật để tạo tài khoản admin</p>
                </div>

                {done ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="fire-card p-8 text-center"
                    >
                        <div className="text-5xl mb-4">🎉</div>
                        <h2 className="font-vn font-bold text-xl text-white mb-2">Tạo Admin Thành Công!</h2>
                        <p className="text-[#9a9a9a] mb-2 text-sm">Email: <span className="text-[#ff7a00]">{form.email}</span></p>
                        <p className="text-[#9a9a9a] text-sm mb-6">Mật khẩu: <span className="text-[#ff7a00]">{form.password}</span></p>
                        <button
                            onClick={() => router.push('/auth/login')}
                            className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-[#ff2a2a] to-[#ff7a00] text-white font-vn font-bold text-lg hover:opacity-90 transition-opacity"
                        >
                            Đăng Nhập Ngay
                        </button>
                    </motion.div>
                ) : (
                    <div className="fire-card p-8">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-semibold text-[#9a9a9a] mb-2 font-vn uppercase tracking-wider">Tên Admin</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7a00] w-5 h-5 flex items-center">
                                        <User size={18} />
                                    </div>
                                    <input
                                        name="displayName"
                                        type="text"
                                        placeholder="Quản trị viên STEM26"
                                        value={form.displayName}
                                        onChange={handleChange}
                                        className="input-fire"
                                        style={{ paddingLeft: '3rem' }}
                                        autoComplete="name"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-[#9a9a9a] mb-2 font-vn uppercase tracking-wider">Email Admin</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7a00] w-5 h-5 flex items-center">
                                        <Mail size={18} />
                                    </div>
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="admin@stem26.com"
                                        value={form.email}
                                        onChange={handleChange}
                                        className="input-fire"
                                        style={{ paddingLeft: '3rem' }}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-semibold text-[#9a9a9a] mb-2 font-vn uppercase tracking-wider">Mật Khẩu</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7a00] w-5 h-5 flex items-center">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        name="password"
                                        type="password"
                                        placeholder="Tối thiểu 6 ký tự"
                                        value={form.password}
                                        onChange={handleChange}
                                        className="input-fire"
                                        style={{ paddingLeft: '3rem' }}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            {/* Secret */}
                            <div>
                                <label className="block text-xs font-semibold text-[#ff2a2a]/80 mb-2 font-vn uppercase tracking-wider">🔑 Mã Bí Mật Admin</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff2a2a] w-5 h-5 flex items-center">
                                        <Key size={18} />
                                    </div>
                                    <input
                                        name="secret"
                                        type="password"
                                        placeholder="Nhập mã bí mật"
                                        value={form.secret}
                                        onChange={handleChange}
                                        className="input-fire border-[#ff2a2a]/30"
                                        style={{ paddingLeft: '3rem' }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-[#ff2a2a] to-[#ff7a00] text-white font-vn font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-opacity mt-2 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <><Shield size={18} /> TẠO TÀI KHOẢN ADMIN</>
                                )}
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <Link href="/auth/login" className="text-[#9a9a9a] hover:text-white text-sm transition-colors">
                                ← Quay lại đăng nhập
                            </Link>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
