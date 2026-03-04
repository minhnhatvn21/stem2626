'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface CountdownProps {
    seconds: number;
    onComplete?: () => void;
    size?: number;
    strokeWidth?: number;
}

export function Countdown({ seconds, onComplete, size = 120, strokeWidth = 8 }: CountdownProps) {
    const [timeLeft, setTimeLeft] = useState(seconds);
    const [isRunning, setIsRunning] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout>();

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (timeLeft / seconds) * circumference;
    const color = timeLeft > seconds * 0.6 ? '#22c55e' : timeLeft > seconds * 0.3 ? '#ffc400' : '#ff2a2a';

    useEffect(() => {
        if (!isRunning) return;
        intervalRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(intervalRef.current);
                    setIsRunning(false);
                    onComplete?.();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [isRunning, onComplete]);

    return (
        <div className="flex flex-col items-center gap-2">
            <svg width={size} height={size} className="countdown-ring -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    strokeLinecap="round"
                    animate={{ strokeDashoffset: circumference - progress }}
                    transition={{ duration: 0.5 }}
                    style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                />
            </svg>
            <motion.div
                key={timeLeft}
                initial={{ scale: 1.3, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute font-orbitron font-bold text-white"
                style={{ fontSize: size / 3.5, color }}
            >
                {timeLeft}
            </motion.div>
        </div>
    );
}

export function CountdownInline({ seconds, onComplete }: { seconds: number; onComplete?: () => void }) {
    const [timeLeft, setTimeLeft] = useState(seconds);

    useEffect(() => {
        if (timeLeft <= 0) { onComplete?.(); return; }
        const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
        return () => clearTimeout(t);
    }, [timeLeft, onComplete]);

    const color = timeLeft > seconds * 0.6 ? 'text-green-400' : timeLeft > seconds * 0.3 ? 'text-yellow-400' : 'text-red-400';

    return (
        <motion.span
            key={timeLeft}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`font-orbitron font-bold ${color}`}
        >
            {timeLeft}s
        </motion.span>
    );
}
