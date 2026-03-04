'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    glow?: boolean;
    onClick?: () => void;
}

export function Card({ children, className = '', glow = false, onClick }: CardProps) {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            className={`fire-card p-6 ${glow ? 'animate-pulse-fire' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </motion.div>
    );
}

export function GlowCard({ children, className = '', color = 'orange' }: { children: React.ReactNode; className?: string; color?: 'red' | 'orange' | 'yellow' }) {
    const glowClasses = {
        red: 'border-[#ff2a2a]/40 shadow-[0_0_30px_rgba(255,42,42,0.2)]',
        orange: 'border-[#ff7a00]/40 shadow-[0_0_30px_rgba(255,122,0,0.2)]',
        yellow: 'border-[#ffc400]/40 shadow-[0_0_30px_rgba(255,196,0,0.2)]',
    };

    return (
        <div className={`bg-[#1a1a1a] border rounded-xl p-6 ${glowClasses[color]} ${className}`}>
            {children}
        </div>
    );
}
