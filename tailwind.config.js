/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                'fire-red': '#ff2a2a',
                'fire-orange': '#ff7a00',
                'fire-yellow': '#ffc400',
                'bg-dark': '#0a0a0a',
                'bg-card': '#1a1a1a',
            },
            fontFamily: {
                orbitron: ['Orbitron', 'sans-serif'],
                inter: ['Inter', 'sans-serif'],
            },
            animation: {
                'pulse-fire': 'pulse-fire 2s ease-in-out infinite',
                'flicker': 'flicker 2s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
