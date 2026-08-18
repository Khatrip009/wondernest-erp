// contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const getClientInfo = async () => {
  try {
    const ipRes = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipRes.json();
    const ip = ipData.ip;

    const locRes = await fetch(`https://ipapi.co/${ip}/json/`);
    const locData = await locRes.json();

    return { ip, location: locData };
  } catch (error) {
    console.error('Failed to fetch client info:', error);
    return { ip: null, location: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const createSessionAndLog = async (userId, accessToken, clientInfo, profileData) => {
    const { ip, location } = clientInfo;
    const userAgent = navigator.userAgent;

    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: accessToken,
        ip_address: ip,
        user_agent: userAgent,
        is_active: true,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Failed to create session:', sessionError);
      return;
    }

    const sessionId = sessionData.id;
    localStorage.setItem('session_id', sessionId);

    if (profileData) {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          organization_id: profileData.organization_id || null,
          branch_id: profileData.branch_id || null,
          action: 'login',
          entity_type: 'user',
          ip_address: ip,
          user_agent: userAgent,
          location: location || null,
        })
        .select('id')
        .single()
        .catch((err) => console.error('Failed to log activity:', err));
    }
  };

  const invalidateSession = async () => {
    const sessionId = localStorage.getItem('session_id');
    if (sessionId) {
      try {
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('id', sessionId);
      } catch (err) {
        console.error('Failed to invalidate session:', err);
      }
      localStorage.removeItem('session_id');
    }
  };

  const signIn = async (identifier, password) => {
    let email = identifier;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', identifier)
        .single();
      if (error || !data?.email) throw new Error('User not found');
      email = data.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data?.user) {
      const userId = data.user.id;
      const accessToken = data.session.access_token;

      const clientInfo = await getClientInfo();
      const profileData = await fetchProfile(userId);

      // Set profile and user together to avoid mismatch
      setProfile(profileData);
      setUser(data.user);

      await createSessionAndLog(userId, accessToken, clientInfo, profileData);
    }
  };

  const signOut = async () => {
    await invalidateSession();
    await supabase.auth.signOut();
    // onAuthStateChange will clear user and profile
  };

  useEffect(() => {
    const getSession = async () => {
      setProfileLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const prof = await fetchProfile(currentUser.id);
        setProfile(prof);
      } else {
        setProfile(null);
      }
      setProfileLoading(false);
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setProfileLoading(true);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const prof = await fetchProfile(currentUser.id);
          setProfile(prof);
        } else {
          setProfile(null);
          localStorage.removeItem('session_id');
        }
        setProfileLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    profileLoading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};