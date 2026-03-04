'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FireBackgroundCanvas } from '@/components/effects/FireBackgroundCanvas';
import { Button } from '@/components/ui/Button';
import { Zap, Shield, Users, Trophy, Flame, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const modules = [
  {
    icon: <Shield size={32} />,
    title: 'CHIẾN BINH',
    subtitle: 'Module 1',
    desc: 'Luyện tập cá nhân - Trả lời câu hỏi theo cấp độ, tích điểm và nâng hạng',
    href: '/battle/warrior',
    color: '#ff2a2a',
  },
  {
    icon: <Users size={32} />,
    title: 'HỢP SỨC TÁC CHIẾN',
    subtitle: 'Module 2',
    desc: 'Chiến đấu theo đội - Tranh chiếm bản đồ lãnh thổ theo thời gian thực',
    href: '/battle/team-battle',
    color: '#4a9eff',
  },
  {
    icon: <Zap size={32} />,
    title: 'NHANH NHƯ CHỚP',
    subtitle: 'Module 3',
    desc: 'Thi đấu cá nhân tốc độ cao - Ai trả lời đúng và nhanh nhất giành điểm',
    href: '/battle/flash',
    color: '#ffc400',
  },
];

const stats = [
  { label: 'Học sinh tham gia', value: '500+' },
  { label: 'Câu hỏi', value: '200+' },
  { label: 'Đội thi đấu', value: '50+' },
  { label: 'Chủ đề', value: '10+' },
];

export default function HomePage() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.push('/dashboard');
    }
  }, [firebaseUser, loading, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      <FireBackgroundCanvas />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[#ff7a00]/20 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Flame size={28} className="text-[#ff7a00]" style={{ filter: 'drop-shadow(0 0 8px #ff7a00)' }} />
          <span className="font-orbitron font-bold text-xl fire-gradient-text">STEM26</span>
          <span className="text-[#9a9a9a] text-sm hidden md:block">Năng Lượng Xanh</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="outline" size="sm">Đăng Nhập</Button>
          </Link>
          <Link href="/auth/register">
            <Button variant="fire" size="sm">Đăng Ký</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 w-full flex flex-col items-center px-6">
        <div className="w-full max-w-7xl">
          <div className="pt-20 pb-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-2 rounded-full border border-[#ff7a00]/40 text-[#ff7a00] text-sm font-semibold mb-6 bg-[#ff7a00]/10">
                🔥 CUỘC THI KIẾN THỨC – MÙA 2025
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-vn font-black text-4xl md:text-6xl lg:text-7xl mb-4 leading-tight"
            >
              <span className="fire-gradient-text">NĂNG LƯỢNG XANH</span>
              <br />
              <span className="text-white">CHIẾN BINH</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[#9a9a9a] text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Cuộc thi kiến thức STEM về năng lượng bền vững dành cho học sinh tiểu học.
              Chiến đấu, học hỏi, và bảo vệ hành tinh xanh!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/auth/register">
                <Button variant="fire" size="lg" className="flex items-center gap-2">
                  <Zap size={20} />
                  Tham Gia Ngay
                  <ChevronRight size={20} />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg">Đã Có Tài Khoản</Button>
              </Link>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20"
          >
            {stats.map((s, i) => (
              <div key={i} className="fire-card text-center p-6">
                <div className="font-orbitron font-black text-3xl fire-gradient-text">{s.value}</div>
                <div className="text-[#9a9a9a] text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Modules */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mb-20"
          >
            <h2 className="font-vn font-bold text-2xl md:text-3xl text-center text-white mb-2">
              3 CHIẾN TRƯỜNG
            </h2>
            <p className="text-center text-[#9a9a9a] mb-10">Chọn phương thức chiến đấu của bạn</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {modules.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="fire-card p-8 text-center group cursor-pointer"
                  onClick={() => router.push('/auth/register')}
                >
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 mx-auto"
                    style={{ background: `${m.color}22`, color: m.color, boxShadow: `0 0 20px ${m.color}44` }}
                  >
                    {m.icon}
                  </div>
                  <div className="text-xs text-[#9a9a9a] font-semibold mb-1 uppercase tracking-widest">{m.subtitle}</div>
                  <h3 className="font-vn font-bold text-xl text-white mb-3 group-hover:text-[#ff7a00] transition-colors">{m.title}</h3>
                  <p className="text-[#9a9a9a] text-sm leading-relaxed">{m.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <footer className="text-center text-[#9a9a9a] text-sm pb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy size={16} className="text-[#ffc400]" />
              <span>STEM26 – Năng Lượng Xanh © 2025</span>
              <Trophy size={16} className="text-[#ffc400]" />
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
