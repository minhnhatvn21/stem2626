'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface PlayerScore {
    userId: string;
    displayName: string;
    score: number;
    correctCount: number;
}

interface FlashMapProps {
    players: PlayerScore[];
    myUserId?: string;
}

// 10 rows (Y), 5 columns (X)
const ROWS = 10;
const COLS = 5;

// Define some cute avatars based on userId
const AVATARS = ['🐯', '🐻', '🐰', '🐼', '🦊', '🦁', '🐮', '🐷', '🐸', '🐙'];

export function FlashMap({ players, myUserId }: FlashMapProps) {
    // Generate grid tiles
    const tiles = useMemo(() => {
        const arr = [];
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                arr.push({ id: `${x}-${y}`, x, y });
            }
        }
        return arr;
    }, []);

    // Map players to positions
    const mapPlayers = useMemo(() => {
        return players.map((p, index) => {
            // 100 points = 1 step. Max step is ROWS - 1.
            const steps = Math.min(Math.floor(p.score / 100), ROWS - 1);

            // Assign a column deterministically but pseudo-randomly based on userId
            let hash = 0;
            for (let i = 0; i < p.userId.length; i++) {
                hash += p.userId.charCodeAt(i);
            }
            const col = hash % COLS;

            const avatar = AVATARS[hash % AVATARS.length];
            const isMe = p.userId === myUserId;

            return {
                ...p,
                x: col,
                y: steps,
                avatar,
                isMe
            };
        });
    }, [players, myUserId]);

    return (
        <div className="relative w-full aspect-square md:aspect-video lg:aspect-square bg-[#0a0a0a]/50 rounded-xl overflow-hidden border border-[#ffc400]/20 min-h-[400px]">
            {/* 3D Container class */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none perspective-[1200px] scale-100 md:scale-125 lg:scale-150 mt-12 md:mt-24">
                {/* The Map itself */}
                <div
                    className="relative w-[300px] h-[600px] transition-transform duration-1000 origin-center"
                    style={{
                        transform: 'rotateX(60deg) rotateZ(-45deg)',
                        transformStyle: 'preserve-3d'
                    }}
                >
                    {/* Grid Background */}
                    <div className="absolute inset-0 flex flex-wrap-reverse" style={{ width: '100%', height: '100%' }}>
                        {tiles.map(tile => {
                            // Style calculation for isometric grid
                            const isRiver = tile.y === Math.floor(ROWS / 2); // Middle row as river maybe?
                            return (
                                <div
                                    key={tile.id}
                                    className="border border-[#ffffff]/10"
                                    style={{
                                        width: `${100 / COLS}%`,
                                        height: `${100 / ROWS}%`,
                                        backgroundColor: isRiver ? 'rgba(0, 150, 255, 0.2)' : 'rgba(100, 255, 100, 0.05)',
                                    }}
                                />
                            );
                        })}
                    </div>

                    {/* Render Players */}
                    {mapPlayers.map(p => {
                        // Calculate position % inside the parent. 
                        // Note: Because it's a flex-wrap-reverse, Y=0 is at bottom!
                        // So bottom is 0%, left is x * (100/COLS)%
                        const leftPct = (p.x * 100 / COLS) + (50 / COLS);
                        const bottomPct = (p.y * 100 / ROWS) + (50 / ROWS);

                        return (
                            <motion.div
                                key={p.userId}
                                initial={false}
                                animate={{
                                    left: `${leftPct}%`,
                                    bottom: `${bottomPct}%`,
                                }}
                                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                                className="absolute"
                                style={{
                                    // Compensate for map rotation so avatar stands upright
                                    transform: 'translate(-50%, 50%) rotateZ(45deg) rotateX(-60deg)',
                                }}
                            >
                                <div className={`relative flex flex-col items-center justify-center`}>
                                    {/* Player Tag */}
                                    <div className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold mb-1 shadow-lg pointer-events-auto
                                        ${p.isMe ? 'bg-[#ffc400] text-black' : 'bg-black/80 text-white border border-white/20'}`}
                                    >
                                        {p.displayName}
                                    </div>

                                    {/* Avatar Bubble */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-black/60 shadow-xl border-2 pointer-events-auto
                                        ${p.isMe ? 'border-[#ffc400] shadow-[0_0_15px_rgba(255,196,0,0.6)]' : 'border-white/40'}`}
                                    >
                                        {p.avatar}
                                    </div>

                                    {/* Level Star ? */}
                                    <div className="absolute bottom-0 -right-2 bg-gradient-to-br from-yellow-300 to-orange-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                        ⭐ {p.correctCount}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Overlay UI elements (e.g., Lượt 1, Phe Ta, etc) */}
            <div className="absolute top-4 left-4 font-orbitron font-black text-2xl text-[#ffc400] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {/* We can show current map stage here if needed */}
                BẢN ĐỒ GIAO TRANH
            </div>
        </div>
    );
}
