
"use client";

import React, { type ReactNode } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
// import { useRouter } from 'next/navigation';
// import { Dumbbell } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  // const { currentUser, loading } = useAuth();
  // const router = useRouter();

  // React.useEffect(() => {
  //   if (!loading && !currentUser) {
  //     router.push('/login');
  //   }
  // }, [currentUser, loading, router]);

  // if (loading || !currentUser) {
  //   return (
  //     <div className="flex flex-col justify-center items-center min-h-[calc(100vh-4rem)] bg-background">
  //       <Dumbbell className="h-16 w-16 text-primary animate-spin mb-4" />
  //       <p className="text-muted-foreground">Loading your personalized workout experience...</p>
  //     </div>
  //   );
  // }

  return <>{children}</>; // AuthGuard is now bypassed
}
