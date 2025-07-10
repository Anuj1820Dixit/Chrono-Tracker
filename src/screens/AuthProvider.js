import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load session from SecureStore on mount
  useEffect(() => {
    (async () => {
      const access_token = await SecureStore.getItemAsync('sb-access-token');
      const refresh_token = await SecureStore.getItemAsync('sb-refresh-token');
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error && data?.user) {
          setUser(data.user);
        }
      }
      setLoading(false);
    })();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        await SecureStore.setItemAsync('sb-access-token', session.access_token);
        await SecureStore.setItemAsync('sb-refresh-token', session.refresh_token);
      } else {
        setUser(null);
        await SecureStore.deleteItemAsync('sb-access-token');
        await SecureStore.deleteItemAsync('sb-refresh-token');
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, []);

  // Auth actions
  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };
  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); // Reset guest state on sign out
  };
  const signInAsGuest = async () => {
    setUser({ id: 'guest', email: 'guest@guest.com', isGuest: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 