// contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Helper: get client IP and location from free APIs ---
const getClientInfo = async () => {
  try {
    // Get public IP
    const ipRes = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipRes.json();
    const ip = ipData.ip;

    // Get location details from ipapi.co (using the same IP)
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

  // --- Fetch user profile from 'profiles' table ---
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

  // --- Create a new user session and log activity ---
  const createSessionAndLog = async (userId, accessToken, clientInfo, profileData) => {
    const { ip, location } = clientInfo;
    const userAgent = navigator.userAgent;

    // 1. Insert session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: accessToken, // JWT token
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

    // 2. Log the login activity (if we have profile info)
    if (profileData) {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          organization_id: profileData.organization_id || null,
          branch_id: profileData.branch_id || null,
          action: 'login',
          entity_type: 'user',
          entity_id: userId,
          ip_address: ip,
          user_agent: userAgent,
          location: location || null,
        })
        .select('id')
        .single()
        .catch((err) => console.error('Failed to log activity:', err));
    }
  };

  // --- Invalidate session on logout ---
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

  // --- Sign in ---
  const signIn = async (identifier, password) => {
    let email = identifier;
    // If identifier is not an email, look up email from profiles using user_id
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', identifier)
        .single();
      if (error || !data?.email) throw new Error('User not found');
      email = data.email;
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // After successful login, fetch profile and create session + activity log
    if (data?.user) {
      const userId = data.user.id;
      const accessToken = data.session.access_token;

      // Get client info (IP & location)
      const clientInfo = await getClientInfo();

      // Fetch profile (so we can include org/branch in activity log)
      const profileData = await fetchProfile(userId);
      if (profileData) setProfile(profileData); // update state

      // Create session and log activity
      await createSessionAndLog(userId, accessToken, clientInfo, profileData);

      // Set user (will also be set by onAuthStateChange, but do it here for immediate UI)
      setUser(data.user);
    }
  };

  // --- Sign out ---
  const signOut = async () => {
    await invalidateSession();        // mark session inactive
    await supabase.auth.signOut();    // sign out from Supabase
    // The onAuthStateChange will clear user and profile automatically
  };

  // --- Effect: initial session and auth state listener ---
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const prof = await fetchProfile(currentUser.id);
        setProfile(prof);
      }
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const prof = await fetchProfile(currentUser.id);
          setProfile(prof);
        } else {
          setProfile(null);
          localStorage.removeItem('session_id'); // clean up on any sign-out
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // --- Context value ---
  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};