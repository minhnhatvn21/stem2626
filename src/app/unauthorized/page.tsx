'use client';

import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { ShieldOff } from 'lucide-react';
import Link from 'next/link';

export default function UnauthorizedPage() {
    const { appUser } = useAuth();
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative">
            <FireBackgroundCanvas />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center z-10 p-8 max-w-md"
            >
                <div className="inline-flex w-20 h-20 rounded-full bg-[#ff2a2a]/20 border border-[#ff2a2a]/40 items-center justify-center mb-6" style={{ boxShadow: '0 0 30px rgba(255,42,42,0.3)' }}>
                    <ShieldOff size={36} className="text-[#ff2a2a]" />
                </div>
                <h1 className="font-orbitron font-black text-3xl text-white mb-3">TRUY CẬP BỊ TỪ CHỐI</h1>
                <p className="text-[#9a9a9a] mb-8">Bạn không có quyền truy cập trang này. Vui lòng đăng nhập với tài khoản phù hợp.</p>
                <div className="flex gap-3 justify-center">
                    <Link href={appUser ? '/dashboard' : '/auth/login'}>
                        <Button variant="fire">Quay Về</Button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
