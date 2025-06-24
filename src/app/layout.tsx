
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: 'Workout Tracker',
  description: 'Track your workouts and make gains!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6.5 6.5 11 11%22/><path d=%22m21 21-1-1%22/><path d=%22m3 3 1 1%22/><path d=%22m18 22 4-4%22/><path d=%22m6 2 4 4%22/><path d=%22m3 10 7-7%22/><path d=%22m14 21 7-7%22/><rect width=%225%22 height=%225%22 x=%2214%22 y=%222%22 rx=%221%22/><rect width=%225%22 height=%225%22 x=%225%22 y=%2217%22 rx=%221%22/></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6.5 6.5 11 11%22/><path d=%22m21 21-1-1%22/><path d=%22m3 3 1 1%22/><path d=%22m18 22 4-4%22/><path d=%22m6 2 4 4%22/><path d=%22m3 10 7-7%22/><path d=%22m14 21 7-7%22/><rect width=%225%22 height=%225%22 x=%2214%22 y=%222%22 rx=%221%22/><rect width=%225%22 height=%225%22 x=%225%22 y=%2217%22 rx=%221%22/></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Toaster />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
