import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, MASTER_ADMIN_EMAIL } from '../firebase/config';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  hasPrivilege: (priv: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setUserProfile(snap.data() as UserProfile);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) await fetchProfile(currentUser.uid);
  };

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const isMaster = user.email === MASTER_ADMIN_EMAIL;
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        nickname: user.displayName || '',
        photoURL: user.photoURL || '',
        role: isMaster ? 'master_admin' : 'member',
        teams: [],
        privileges: [],
        theme: 'light',
        createdAt: serverTimestamp(),
        isDeleted: false,
      };
      await setDoc(ref, profile);
      setUserProfile(profile);
    } else {
      const data = snap.data() as UserProfile;
      // Ensure master admin always has correct role
      if (user.email === MASTER_ADMIN_EMAIL && data.role !== 'master_admin') {
        await setDoc(ref, { ...data, role: 'master_admin' }, { merge: true });
        setUserProfile({ ...data, role: 'master_admin' });
      } else {
        setUserProfile(data);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const isMasterAdmin = userProfile?.role === 'master_admin';
  const isAdmin = userProfile?.role === 'master_admin' || userProfile?.role === 'admin';
  const hasPrivilege = (priv: string) => {
    if (isAdmin) return true;
    return userProfile?.privileges?.includes(priv as any) ?? false;
  };

  return (
    <AuthContext.Provider value={{
      currentUser, userProfile, loading,
      signInWithGoogle, logout, refreshProfile,
      isMasterAdmin, isAdmin, hasPrivilege
    }}>
      {children}
    </AuthContext.Provider>
  );
};
