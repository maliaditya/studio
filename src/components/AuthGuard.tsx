
"use client";

import React, { type ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { BrainCircuit } from 'lucide-react';

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
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]">
        <BrainCircuit className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your Dock experience...</p>
      </div>
    );
  }

  return <>{children}</>;
}
