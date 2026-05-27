import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getUserProfile, createUserProfile, subscribeToUserProfile } from '../lib/firestoreService';
import { User as AppUser } from '../types';

interface UserContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  appUser: null,
  loading: true,
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile subscription if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(firebaseUser);
      setLoading(true);

      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (!profile) {
            // ... (setup new profile)
            const isDemoAdmin = firebaseUser.email === 'admin@nexotrade.com';
            const isDemoUser = firebaseUser.email === 'john@example.com';
            
            const newProfile: AppUser = {
              uid: firebaseUser.uid,
              id: Math.random().toString(36).substring(2, 8).toUpperCase(),
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || (isDemoAdmin ? 'Admin' : isDemoUser ? 'John Doe' : 'Trader'),
              portfolioValue: isDemoAdmin ? 1000000 : 10000,
              availableBalance: isDemoAdmin ? 1000000 : 10000,
              level: 1,
              kycVerified: isDemoAdmin || isDemoUser,
              memberSince: new Date().toLocaleDateString(),
              winRate: 0,
              referrals: 0,
              role: isDemoAdmin ? 'admin' : 'user',
              status: 'active',
            };
            await createUserProfile(firebaseUser.uid, newProfile);
            setAppUser(newProfile);
          } else {
            setAppUser(profile as AppUser);
          }

          unsubscribeProfile = subscribeToUserProfile(firebaseUser.uid, (data) => {
            setAppUser(data as AppUser);
          });
          
          setLoading(false);
        } catch (error) {
          console.error("Profile initialization error:", error);
          setLoading(false);
        }
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, appUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
