'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-xs font-semibold text-[#9a9a9a] mb-2 font-vn uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7a00] pointer-events-none flex items-center justify-center w-5 h-5">
                        {icon}
                    </div>
                )}
                <input
                    className={`input-fire ${error ? 'border-[#ff2a2a]' : ''} ${className}`}
                    style={{ paddingLeft: icon ? '3rem' : '1rem' }}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-sm text-[#ff2a2a]">{error}</p>}
        </div>
    );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-[#9a9a9a] mb-2 font-orbitron uppercase tracking-wider">
                    {label}
                </label>
            )}
            <select
                className={`input-fire appearance-none cursor-pointer ${error ? 'border-[#ff2a2a]' : ''} ${className}`}
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ff7a00' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                {...props}
            >
                {options.map(o => <option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>)}
            </select>
            {error && <p className="mt-1 text-sm text-[#ff2a2a]">{error}</p>}
        </div>
    );
}
