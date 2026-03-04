'use client';

import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'easy' | 'medium' | 'hard' | 'live' | 'draft' | 'ended' | 'default';
    className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    const variantClasses = {
        easy: 'badge-easy',
        medium: 'badge-medium',
        hard: 'badge-hard',
        live: 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30',
        draft: 'bg-white/10 text-white/70 border border-white/20',
        ended: 'bg-[#9a9a9a]/20 text-[#9a9a9a] border border-[#9a9a9a]/30',
        default: 'bg-[#ff7a00]/20 text-[#ff7a00] border border-[#ff7a00]/30',
    };

    return (
        <span className={`badge-fire ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    );
}
