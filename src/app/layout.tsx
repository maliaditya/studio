

"use client";

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Analytics } from '@vercel/analytics/react';
import { BackgroundAudioPlayer } from '@/components/BackgroundAudioPlayer';
import { MatrixBackground } from '@/components/MatrixBackground';
import { DefaultBackground } from '@/components/DefaultBackground';
import { ClothBackground } from '@/components/ClothBackground';
import { FloatingVideoPlayer } from '@/components/FloatingVideoPlayer';
import { PistonsHead } from '@/components/PistonsHead';
import React from 'react';

// export const metadata: Metadata = {
//   title: 'LifeOS',
//   description: 'Your personal dashboard for growth and productivity.',
// };
// Metadata needs to be in a server component, moving to a new AppWrapper client component

function AppWrapper({ children }: { children: React.ReactNode }) {
  const { isPistonsHeadOpen, setIsPistonsHeadOpen, openPopups, ResourcePopup } = useAuth();

  return (
    <>
      <DefaultBackground />
      <MatrixBackground />
      <ClothBackground />
      <Header />
      <PistonsHead />
      <main>{children}</main>
      <Toaster />
      <BackgroundAudioPlayer />
      <FloatingVideoPlayer />
      {ResourcePopup && Array.from(openPopups.values()).map(popupState => (
        <ResourcePopup key={popupState.resourceId} popupState={popupState} />
      ))}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>LifeOS</title>
        <meta name="description" content="Your personal dashboard for growth and productivity." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M12 2a10 10 0 0 0-3.91 19.84c.62.12 1.63-.3 1.63-1.12 0-.54-.02-1.98-.03-3.88-2.6.56-3.15-1.08-3.32-1.57-.17-.48-.68-1.22-1.1-1.47-.35-.2-.85-.65-.01-.66.78-.01 1.35.73 1.53 1.05.9 1.55 2.35 1.1 2.93.84.09-.65.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.35-.01 2.44-.01 2.77 0 .83 1.01 1.23 1.64 1.1A10 10 0 0 0 12 2Z%22/><path d=%22M12 8.4v3.3M10.35 7.5a2.5 2.5 0 0 1 3.3 0%22/><path d=%22M6.1 12.3a6 6 0 0 1 11.8 0%22/><path d=%22M12 11.6v6.3%22/><path d=%22M9.15 15.8a3.5 3.5 0 0 1 5.7 0%22/></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M12 2a10 10 0 0 0-3.91 19.84c.62.12 1.63-.3 1.63-1.12 0-.54-.02-1.98-.03-3.88-2.6.56-3.15-1.08-3.32-1.57-.17-.48-.68-1.22-1.1-1.47-.35-.2-.85-.65-.01-.66.78-.01 1.35.73 1.53 1.05.9 1.55 2.35 1.1 2.93.84.09-.65.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.35-.01 2.44-.01 2.77 0 .83 1.01 1.23 1.64 1.1A10 10 0 0 0 12 2Z%22/><path d=%22M12 8.4v3.3M10.35 7.5a2.5 2.5 0 0 1 3.3 0%22/><path d=%22M6.1 12.3a6 6 0 0 1 11.8 0%22/><path d=%22M12 11.6v6.3%22/><path d=%22M9.15 15.8a3.5 3.5 0 0 1 5.7 0%22/></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <AppWrapper>{children}</AppWrapper>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
