'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, LogOut, User, LayoutDashboard, Shield, Users, Zap, Settings, Trophy } from 'lucide-react';

export function NavHeader() {
    const { appUser, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    const isAdmin = appUser?.role === 'admin';

    const studentLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
        { href: '/battle/warrior', label: 'Chiến Binh', icon: <Shield size={16} /> },
        { href: '/battle/team-battle', label: 'Hợp Sức', icon: <Users size={16} /> },
        { href: '/battle/flash', label: 'Nhanh Chớp', icon: <Zap size={16} /> },
        { href: '/profile', label: 'Hồ Sơ', icon: <User size={16} /> },
    ];

    const adminLinks = [
        { href: '/admin', label: 'Tổng Quan', icon: <LayoutDashboard size={16} /> },
        { href: '/admin/questions', label: 'Câu Hỏi', icon: <Trophy size={16} /> },
        { href: '/admin/sessions', label: 'Phiên Thi', icon: <Settings size={16} /> },
        { href: '/admin/teams', label: 'Đội Thi', icon: <Users size={16} /> },
        { href: '/admin/results', label: 'Kết Quả', icon: <Zap size={16} /> },
    ];

    const links = isAdmin ? adminLinks : studentLinks;

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#ff7a00]/20">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 flex-shrink-0">
                        <Flame size={24} className="text-[#ff7a00]" style={{ filter: 'drop-shadow(0 0 6px #ff7a00)' }} />
                        <span className="font-orbitron font-bold text-lg fire-gradient-text hidden sm:block">STEM26</span>
                    </Link>

                    {/* Nav Links */}
                    <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar">
                        {links.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${pathname === link.href || pathname.startsWith(link.href + '/')
                                        ? 'text-[#ff7a00] bg-[#ff7a00]/10 border border-[#ff7a00]/30'
                                        : 'text-[#9a9a9a] hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {link.icon}
                                <span className="hidden md:block">{link.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        {appUser && (
                            <div className="hidden sm:flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-full bg-[#ff7a00]/20 border border-[#ff7a00]/40 flex items-center justify-center">
                                    <User size={14} className="text-[#ff7a00]" />
                                </div>
                                <div className="hidden lg:block">
                                    <div className="text-white text-xs font-semibold">{appUser.displayName}</div>
                                    <div className="text-[#9a9a9a] text-xs">{isAdmin ? '⚡ Admin' : `${appUser.totalPoints} điểm`}</div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-1 px-3 py-2 text-[#9a9a9a] hover:text-[#ff2a2a] hover:bg-[#ff2a2a]/10 rounded-lg transition-all duration-200 text-sm"
                            title="Đăng xuất"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </header>
            {/* Spacer to prevent content from hiding behind fixed header */}
            <div className="h-[76px] w-full shrink-0"></div>
        </>
    );
}
