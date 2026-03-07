
"use client";

import React, { type ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/LoadingScreen';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { currentUser, loading: authContextLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // This effect runs when either the context's loading state or the currentUser changes.
    if (!authContextLoading) {
      if (!currentUser) {
        router.push('/login');
      } else {
        setLoading(false); // User is authenticated, stop loading.
      }
    }
  }, [currentUser, authContextLoading, router]);

  if (loading || authContextLoading) {
    return (
      <LoadingScreen
        className="min-h-[calc(100vh-4rem)]"
        label="Securing your session..."
        subLabel="Redirecting to your workspace."
      />
    );
  }

  return <>{children}</>;
}
