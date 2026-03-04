'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
}

export function FireBackgroundCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animFrame: number;
        const particles: Particle[] = [];
        const COLORS = ['#ff2a2a', '#ff7a00', '#ffc400', '#ff5500'];

        function resize() {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        function createParticle(): Particle {
            if (!canvas) return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '' };
            return {
                x: Math.random() * canvas.width,
                y: canvas.height + 10,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -(Math.random() * 2 + 1),
                life: 0,
                maxLife: Math.random() * 80 + 40,
                size: Math.random() * 3 + 1,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
            };
        }

        function animate() {
            if (!canvas || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Add new particles
            if (particles.length < 60 && Math.random() < 0.3) {
                particles.push(createParticle());
            }

            // Update and draw particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life++;
                p.vx += (Math.random() - 0.5) * 0.1;

                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                    continue;
                }

                const alpha = (1 - p.life / p.maxLife) * 0.4;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 8;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            animFrame = requestAnimationFrame(animate);
        }

        animate();

        return () => {
            cancelAnimationFrame(animFrame);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
            style={{ opacity: 0.6 }}
        />
    );
}
