// User types
export type UserRole = 'student' | 'admin';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  totalPoints: number;
  teamId?: string;
  badges?: string[];
  avatar?: string;
}
