
"use client";

import React, { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainCircuit } from 'lucide-react';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';

const REMEMBER_LOGIN_KEY = 'dock_remember_login_v1';
type RememberLoginPayload = { username?: string; password?: string; remember?: boolean };

function LoginPageContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessionBlockedMessage, setSessionBlockedMessage] = useState('');
  const [isDesktopRuntime, setIsDesktopRuntime] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { signIn, register, loading, currentUser } = useAuth();

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace('/my-plate');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RememberLoginPayload;
      if (!parsed?.remember) return;
      if (typeof parsed.username === 'string') setUsername(parsed.username);
      if (typeof parsed.password === 'string') setPassword(parsed.password);
      setRememberMe(true);
    } catch {
      // ignore malformed stored login data
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDesktopRuntime(Boolean((window as any)?.studioDesktop?.isDesktop));
  }, []);

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    setActiveTab(requestedMode === 'register' ? 'register' : 'login');
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!rememberMe) {
      localStorage.removeItem(REMEMBER_LOGIN_KEY);
      return;
    }
    const payload: RememberLoginPayload = {
      username: username.trim(),
      password,
      remember: true,
    };
    safeSetLocalStorageItem(REMEMBER_LOGIN_KEY, JSON.stringify(payload));
  }, [rememberMe, username, password]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const result = await signIn(username, password);
    if (result?.code === 'SESSION_ACTIVE') {
      setSessionBlockedMessage(result.message);
    } else if (result?.success) {
      setSessionBlockedMessage('');
      router.replace('/my-plate');
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      // Consider using toast for this error
      alert("Passwords do not match.");
      return;
    }
    await register(username, password, registerEmail);
    setSessionBlockedMessage('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <BrainCircuit className="mx-auto h-14 w-14 text-primary mb-2" />
          <CardTitle className="text-2xl lg:text-3xl font-bold text-primary">Dock</CardTitle>
          <CardDescription className="text-muted-foreground">Access your personal dashboard for growth.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground p-3 mb-4 border rounded-md bg-muted/50 space-y-1">
            {isDesktopRuntime ? (
              <>
                <p>After first successful sign-in on this device, offline resume is available and the app can be accessed without internet.</p>
                <p>First sign-in still depends on a working cloud auth backend, not just internet connectivity.</p>
              </>
            ) : (
              <>
                <p>Sign in to sync your workspace to the cloud and access it from any device.</p>
                <p>Internet connection is required for web access.</p>
              </>
            )}
            <p>Demo access: <strong className="text-primary font-mono">demo</strong>/<strong className="text-primary font-mono">demo</strong>.</p>
            <p>
              Like the product?{" "}
              <Link href="/support" className="text-primary underline underline-offset-4">
                Support development
              </Link>
              .
            </p>
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="h-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => {
                      const next = Boolean(checked);
                      setRememberMe(next);
                      if (!next && typeof window !== 'undefined') {
                        localStorage.removeItem(REMEMBER_LOGIN_KEY);
                      }
                    }}
                  />
                  <Label htmlFor="remember-me" className="cursor-pointer text-sm text-muted-foreground">
                    Remember me
                  </Label>
                </div>
                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
                {sessionBlockedMessage && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <p className="font-medium">Account already in use</p>
                    <p className="text-destructive/90">{sessionBlockedMessage}</p>
                    <Button
                      type="button"
                      variant="destructive"
                      className="mt-3 w-full h-9"
                      onClick={async () => {
                        const result = await signIn(username, password, { force: true });
                        if (result?.success) {
                          setSessionBlockedMessage('');
                        }
                      }}
                      disabled={loading}
                    >
                      Force Login (Log Out Other Session)
                    </Button>
                  </div>
                )}
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="Enter your email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading ? 'Registering...' : 'Register'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground pt-4">
            <p>This app uses local browser storage. Your data stays on this computer.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <BrainCircuit className="mx-auto h-14 w-14 text-primary mb-2" />
          <CardTitle className="text-2xl lg:text-3xl font-bold text-primary">Dock</CardTitle>
          <CardDescription className="text-muted-foreground">Loading sign-in…</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
