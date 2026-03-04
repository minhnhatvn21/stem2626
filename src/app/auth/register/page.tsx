'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Flame, Mail, Lock, User, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName || !email || !password) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        if (password !== confirm) {
            toast.error('Mật khẩu xác nhận không khớp');
            return;
        }
        if (password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }
        setLoading(true);
        try {
            await signUp(email, password, displayName);
            toast.success('Đăng ký thành công! Chào mừng chiến binh! ⚡');
            router.push('/dashboard');
        } catch (err: unknown) {
            console.error('Registration error:', err);
            const msg = err instanceof Error ? err.message : String(err);
            const code = (err as { code?: string })?.code ?? '';

            if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
                toast.error('Email này đã được sử dụng. Vui lòng dùng email khác.');
            } else if (code === 'auth/weak-password' || msg.includes('weak-password')) {
                toast.error('Mật khẩu quá yếu. Vui lòng dùng ít nhất 6 ký tự.');
            } else if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
                toast.error('Email không hợp lệ. Vui lòng kiểm tra lại.');
            } else if (code === 'auth/network-request-failed' || msg.includes('network')) {
                toast.error('Lỗi kết nối mạng. Kiểm tra internet và thử lại.');
            } else if (msg.includes('CONFIGURATION_NOT_FOUND') || msg.includes('configuration-not-found')) {
                toast.error('Firebase chưa được cấu hình. Vui lòng bật Email/Password Authentication trong Firebase Console.');
            } else if (msg.includes('API_KEY_INVALID') || code === 'auth/invalid-api-key') {
                toast.error('API Key Firebase không hợp lệ. Kiểm tra file .env.local');
            } else {
                toast.error(`Đăng ký thất bại: ${code || msg || 'Lỗi không xác định'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative p-4">
            <FireBackgroundCanvas />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md z-10"
            >
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-4">
                        <Flame size={36} className="text-[#ff7a00]" style={{ filter: 'drop-shadow(0 0 8px #ff7a00)' }} />
                        <span className="font-orbitron font-black text-2xl fire-gradient-text">STEM26</span>
                    </Link>
                    <h1 className="font-vn font-bold text-2xl text-white">TẠO TÀI KHOẢN CHIẾN BINH</h1>
                    <p className="text-[#9a9a9a] mt-2">Gia nhập đội quân năng lượng xanh!</p>
                </div>

                <div className="fire-card p-8">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <Input
                            label="Tên Chiến Binh"
                            type="text"
                            placeholder="Nguyen Van A"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            icon={<User size={18} />}
                            autoComplete="name"
                        />
                        <Input
                            label="Email"
                            type="email"
                            placeholder="email@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            icon={<Mail size={18} />}
                            autoComplete="email"
                        />
                        <Input
                            label="Mật Khẩu"
                            type="password"
                            placeholder="Tối thiểu 6 ký tự"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            icon={<Lock size={18} />}
                            autoComplete="new-password"
                        />
                        <Input
                            label="Xác Nhận Mật Khẩu"
                            type="password"
                            placeholder="Nhập lại mật khẩu"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            icon={<Lock size={18} />}
                            autoComplete="new-password"
                        />

                        <Button type="submit" variant="fire" size="lg" loading={loading} className="w-full mt-2 flex items-center justify-center gap-2">
                            <UserPlus size={20} />
                            ĐĂNG KÝ CHIẾN ĐẤU
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <span className="text-[#9a9a9a]">Đã có tài khoản? </span>
                        <Link href="/auth/login" className="text-[#ff7a00] hover:text-[#ffc400] font-semibold transition-colors">
                            Đăng nhập
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
