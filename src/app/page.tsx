"use client";

import withAuth from '@/components/auth/withAuth';
import { useAuth } from '@/contexts/AuthContext';

function Home() {
  const { session, supabase } = useAuth();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <div>
      <h1>Welcome, {session?.user?.email}</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default withAuth(Home);