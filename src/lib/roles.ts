import { UserRole } from '@/types/user';

export function isAdmin(role?: UserRole): boolean {
    return role === 'admin';
}

export function isStudent(role?: UserRole): boolean {
    return role === 'student';
}

export function canAccessAdmin(role?: UserRole): boolean {
    return role === 'admin';
}

export function canAccessBattle(role?: UserRole): boolean {
    return role === 'student' || role === 'admin';
}
