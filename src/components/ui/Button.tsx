'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'fire' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    children: React.ReactNode;
}

export function Button({
    variant = 'fire',
    size = 'md',
    loading = false,
    children,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const sizeClasses = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    const variantClasses = {
        fire: 'btn-fire',
        outline: 'bg-transparent border-2 border-[#ff7a00] text-[#ff7a00] hover:bg-[#ff7a00]/10 rounded-lg font-bold font-orbitron uppercase tracking-wider transition-all duration-300',
        ghost: 'bg-transparent text-[#f5f0e0] hover:bg-white/5 rounded-lg font-medium transition-all duration-300',
        danger: 'bg-[#ff2a2a] hover:bg-[#ff4444] text-white rounded-lg font-bold font-orbitron uppercase tracking-wider transition-all duration-300',
    };

    return (
        <motion.button
            whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
            whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
            className={`${variantClasses[variant]} ${sizeClasses[size]} ${className} ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={disabled || loading}
            {...(props as React.ComponentProps<typeof motion.button>)}
        >
            {loading ? (
                <span className="flex items-center gap-2 justify-center">
                    <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                </span>
            ) : children}
        </motion.button>
    );
}
