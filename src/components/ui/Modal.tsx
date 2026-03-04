'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className={`relative w-full ${sizeClasses[size]} bg-[#1a1a1a] border border-[#ff7a00]/30 rounded-xl shadow-[0_0_40px_rgba(255,122,0,0.2)] z-10`}
                    >
                        {title && (
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                <h2 className="font-orbitron font-bold text-lg fire-gradient-text">{title}</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                        <div className="p-6">{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
