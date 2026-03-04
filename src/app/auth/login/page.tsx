'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Flame, Mail, Lock, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, appUser } = useAuth();
    const router = useRouter();
    useEffect(() => {
        // Tự động chuyển trang khi appUser đã tải (do login hoặc đã lưu phiên)
        if (appUser) {
            toast.dismiss(); // Clear saving toasts
            if (appUser.role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/dashboard');
            }
        }
    }, [appUser, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        setLoading(true);
        try {
            await signIn(email, password);
            toast.success('Đăng nhập thành công! ⚡');
            // Router redirect is now handled by useEffect waiting for appUser sync
        } catch (err: unknown) {
            setLoading(false);
            console.error('Login error:', err);
            const msg = err instanceof Error ? err.message : String(err);
            const code = (err as { code?: string })?.code ?? '';

            if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || msg.includes('invalid-credential')) {
                toast.error('Email hoặc mật khẩu không đúng');
            } else if (code === 'auth/too-many-requests') {
                toast.error('Quá nhiều lần thử. Vui lòng đợi vài phút và thử lại.');
            } else if (code === 'auth/network-request-failed') {
                toast.error('Lỗi kết nối mạng. Kiểm tra internet và thử lại.');
            } else if (msg.includes('CONFIGURATION_NOT_FOUND')) {
                toast.error('Firebase Authentication chưa được bật. Vào Firebase Console bật Email/Password.');
            } else {
                toast.error(`Đăng nhập thất bại: ${code || msg}`);
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
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3 mb-4">
                        <Flame size={36} className="text-[#ff7a00]" style={{ filter: 'drop-shadow(0 0 8px #ff7a00)' }} />
                        <span className="font-orbitron font-black text-2xl fire-gradient-text">STEM26</span>
                    </Link>
                    <h1 className="font-vn font-bold text-2xl text-white">CHIẾN BINH ĐĂNG NHẬP</h1>
                    <p className="text-[#9a9a9a] mt-2">Sẵn sàng chiến đấu? Đăng nhập ngay!</p>
                </div>

                {/* Form */}
                <div className="fire-card p-8">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            icon={<Lock size={18} />}
                            autoComplete="current-password"
                        />

                        <Button type="submit" variant="fire" size="lg" loading={loading} className="w-full mt-2 flex items-center justify-center gap-2">
                            <LogIn size={20} />
                            ĐĂNG NHẬP
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <span className="text-[#9a9a9a]">Chưa có tài khoản? </span>
                        <Link href="/auth/register" className="text-[#ff7a00] hover:text-[#ffc400] font-semibold transition-colors">
                            Đăng ký ngay
                        </Link>
                    </div>
                </div>

                {/* Admin setup hint */}
                <div className="mt-4 p-4 rounded-lg border border-[#ff7a00]/20 bg-[#ff7a00]/5 text-sm text-[#9a9a9a] text-center">
                    💡 <strong className="text-[#ff7a00]">Admin?</strong>{' '}
                    <Link href="/setup" className="text-[#ff7a00] hover:text-[#ffc400] underline transition-colors">
                        Tạo tài khoản admin tại đây
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
