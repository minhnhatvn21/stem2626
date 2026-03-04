'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserRole } from '@/types/user';

interface AuthGuardProps {
    children: React.ReactNode;
    redirectTo?: string;
}

export function AuthGuard({ children, redirectTo = '/auth/login' }: AuthGuardProps) {
    const { firebaseUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !firebaseUser) {
            router.push(redirectTo);
        }
    }, [firebaseUser, loading, router, redirectTo]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" />
                    <p className="font-orbitron text-[#ff7a00] animate-pulse">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!firebaseUser) return null;
    return <>{children}</>;
}

interface RoleGuardProps {
    children: React.ReactNode;
    requiredRole: UserRole;
}

export function RoleGuard({ children, requiredRole }: RoleGuardProps) {
    const { appUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && appUser && appUser.role !== requiredRole) {
            router.push('/unauthorized');
        }
    }, [appUser, loading, requiredRole, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <div className="w-16 h-16 border-4 border-[#ff7a00] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!appUser || appUser.role !== requiredRole) return null;
    return <>{children}</>;
}
