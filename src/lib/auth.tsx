'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile,
    User,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUser, getUserById, subscribeToUser } from './firestore';
import { AppUser } from '@/types/user';
import { UserCredential } from 'firebase/auth';

interface AuthContextType {
    firebaseUser: User | null;
    appUser: AppUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<UserCredential>;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);
            if (!user) {
                setAppUser(null);
                setLoading(false);
                return;
            }
            // Subscribe to user doc
            const unsubUser = subscribeToUser(user.uid, (u) => {
                setAppUser(u);
                setLoading(false);
            });
            return () => unsubUser();
        });
        return unsub;
    }, []);

    const signIn = async (email: string, password: string) => {
        return await signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = async (email: string, password: string, displayName: string) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        // Attempt to create Firestore user doc — may fail if rules not yet configured
        try {
            await createUser({
                uid: cred.user.uid,
                email,
                displayName,
                role: 'student',
                totalPoints: 0,
            });
        } catch (firestoreErr) {
            // Firebase Auth succeeded — user is logged in
            // Firestore write failed (rules not configured), log and continue
            console.warn('Firestore user doc creation failed (check security rules):', firestoreErr);
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setAppUser(null);
    };

    return (
        <AuthContext.Provider value={{ firebaseUser, appUser, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
