"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, Search, Users } from 'lucide-react';

import { AuthGuard } from '@/components/AuthGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUsername } from '@/lib/adminUsers';
import { describeUnknownError } from '@/lib/errorMessage';
import { getAccessToken } from '@/lib/localAuth';

type DesktopUserPurchaseOverview = {
  username: string;
  email: string | null;
  isPriviledge: boolean;
  registeredAt: string | null;
  paymentCompleted: boolean;
  purchaseDate: string | null;
  expiresAt: string | null;
  paymentProvider: 'razorpay' | 'upi' | 'paypal' | null;
  desktopStatus: 'active' | 'expired' | 'not-purchased' | 'privileged';
  updatedAt: string | null;
};

type DesktopUsersResponse = {
  users: DesktopUserPurchaseOverview[];
  totals: {
    totalUsers: number;
    privilegedUsers: number;
    activePurchases: number;
    expiredPurchases: number;
    noPurchase: number;
  };
  storageConfigured: boolean;
  error?: string;
};

const resolveCloudBase = () => {
  if (typeof window === 'undefined') return '';
  const desktopBase = (window as any)?.studioDesktop?.authBaseUrl;
  if (typeof desktopBase === 'string' && desktopBase.trim().length > 0) return desktopBase.trim();
  const fromEnv = process.env.NEXT_PUBLIC_AUTH_BASE_URL || '';
  return fromEnv.trim();
};

const formatDateTime = (value: string | null) => {
  if (!value) return 'N/A';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'N/A';
  return new Date(parsed).toLocaleString();
};

const formatDate = (value: string | null) => {
  if (!value) return 'N/A';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'N/A';
  return new Date(parsed).toLocaleDateString();
};

const statusBadgeVariant = (status: DesktopUserPurchaseOverview['desktopStatus']) => {
  if (status === 'active' || status === 'privileged') return 'default';
  return 'secondary';
};

const statusLabel = (status: DesktopUserPurchaseOverview['desktopStatus']) => {
  if (status === 'privileged') return 'Privileged';
  if (status === 'active') return 'Active';
  if (status === 'expired') return 'Expired';
  return 'Not purchased';
};

function AdminUsersPageContent() {
  const { currentUser, ensureCloudSession, signOut } = useAuth();
  const [data, setData] = useState<DesktopUsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [updatingPrivilegeFor, setUpdatingPrivilegeFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const isAdmin = useMemo(() => isAdminUsername(currentUser?.username), [currentUser?.username]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const username = (currentUser?.username || '').trim().toLowerCase();
      let accessToken = username ? getAccessToken(username) : null;
      if (username && !accessToken) {
        const refreshed = await ensureCloudSession();
        if (!refreshed.success) {
          throw new Error(refreshed.message || 'Your cloud admin session expired. Please sign in again.');
        }
        accessToken = getAccessToken(username);
      }

      const cloudBase = resolveCloudBase();
      const localUrl = '/api/admin/desktop-users';
      const url = cloudBase ? `${cloudBase.replace(/\/$/, '')}/api/admin/desktop-users` : localUrl;
      const shouldUseDesktopProxy =
        Boolean((window as any)?.studioDesktop?.isDesktop) &&
        Boolean(cloudBase) &&
        typeof window !== 'undefined' &&
        !url.startsWith(window.location.origin);

      let ok = false;
      let payload: DesktopUsersResponse | null = null;

      if (shouldUseDesktopProxy) {
        const bridge = (window as any)?.studioDesktop?.authHttp;
        if (!bridge?.request) {
          throw new Error('Desktop cloud proxy is unavailable.');
        }
        const proxied = await bridge.request({
          url,
          method: 'GET',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!proxied?.success) {
          throw new Error(describeUnknownError(proxied?.error, 'Failed to call desktop users API.'));
        }
        ok = Boolean(proxied.ok);
        payload = (proxied.data || null) as DesktopUsersResponse | null;
      } else {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        ok = response.ok;
        payload = (await response.json().catch(() => null)) as DesktopUsersResponse | null;
      }

      if ((!ok || !payload) && payload?.error === 'Unauthorized.' && username) {
        const refreshed = await ensureCloudSession();
        if (refreshed.success) {
          accessToken = getAccessToken(username);
          if (shouldUseDesktopProxy) {
            const bridge = (window as any)?.studioDesktop?.authHttp;
            if (!bridge?.request) {
              throw new Error('Desktop cloud proxy is unavailable.');
            }
            const proxied = await bridge.request({
              url,
              method: 'GET',
              headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            });
            if (!proxied?.success) {
              throw new Error(describeUnknownError(proxied?.error, 'Failed to call desktop users API.'));
            }
            ok = Boolean(proxied.ok);
            payload = (proxied.data || null) as DesktopUsersResponse | null;
          } else {
            const response = await fetch(url, {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
              headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            });
            ok = response.ok;
            payload = (await response.json().catch(() => null)) as DesktopUsersResponse | null;
          }
        }
      }

      if (!ok || !payload) {
        throw new Error(payload?.error || 'Failed to load desktop purchase users.');
      }

      setData(payload);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(describeUnknownError(err, 'Failed to load desktop purchase users.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void fetchUsers();
  }, [isAdmin]);

  const recalculateTotals = (users: DesktopUserPurchaseOverview[]) => {
    return users.reduce(
      (accumulator, user) => {
        accumulator.totalUsers += 1;
        if (user.isPriviledge) accumulator.privilegedUsers += 1;
        else if (user.desktopStatus === 'active') accumulator.activePurchases += 1;
        else if (user.desktopStatus === 'expired') accumulator.expiredPurchases += 1;
        else accumulator.noPurchase += 1;
        return accumulator;
      },
      {
        totalUsers: 0,
        privilegedUsers: 0,
        activePurchases: 0,
        expiredPurchases: 0,
        noPurchase: 0,
      }
    );
  };

  const updatePrivilege = async (targetUsername: string, isPriviledge: boolean) => {
    setUpdatingPrivilegeFor(targetUsername);
    setError(null);
    try {
      const username = (currentUser?.username || '').trim().toLowerCase();
      let accessToken = username ? getAccessToken(username) : null;
      if (username && !accessToken) {
        const refreshed = await ensureCloudSession();
        if (!refreshed.success) {
          throw new Error(refreshed.message || 'Your cloud admin session expired. Please sign in again.');
        }
        accessToken = getAccessToken(username);
      }

      const cloudBase = resolveCloudBase();
      const localUrl = '/api/admin/desktop-users';
      const url = cloudBase ? `${cloudBase.replace(/\/$/, '')}/api/admin/desktop-users` : localUrl;
      const shouldUseDesktopProxy =
        Boolean((window as any)?.studioDesktop?.isDesktop) &&
        Boolean(cloudBase) &&
        typeof window !== 'undefined' &&
        !url.startsWith(window.location.origin);
      const requestBody = JSON.stringify({ username: targetUsername, isPriviledge });

      let ok = false;
      let payload = null as { error?: string; user?: { username: string; isPriviledge: boolean } } | null;

      if (shouldUseDesktopProxy) {
        const bridge = (window as any)?.studioDesktop?.authHttp;
        if (!bridge?.request) {
          throw new Error('Desktop cloud proxy is unavailable.');
        }
        const proxied = await bridge.request({
          url,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: requestBody,
        });
        if (!proxied?.success) {
          throw new Error(describeUnknownError(proxied?.error, 'Failed to call desktop users API.'));
        }
        ok = Boolean(proxied.ok);
        payload = (proxied.data || null) as { error?: string; user?: { username: string; isPriviledge: boolean } } | null;
      } else {
        const response = await fetch(url, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: requestBody,
        });
        ok = response.ok;
        payload = (await response.json().catch(() => null)) as { error?: string; user?: { username: string; isPriviledge: boolean } } | null;
      }

      if ((!ok || !payload) && payload?.error === 'Unauthorized.' && username) {
        const refreshed = await ensureCloudSession();
        if (refreshed.success) {
          accessToken = getAccessToken(username);
          if (shouldUseDesktopProxy) {
            const bridge = (window as any)?.studioDesktop?.authHttp;
            if (!bridge?.request) {
              throw new Error('Desktop cloud proxy is unavailable.');
            }
            const proxied = await bridge.request({
              url,
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              body: requestBody,
            });
            if (!proxied?.success) {
              throw new Error(describeUnknownError(proxied?.error, 'Failed to call desktop users API.'));
            }
            ok = Boolean(proxied.ok);
            payload = (proxied.data || null) as { error?: string; user?: { username: string; isPriviledge: boolean } } | null;
          } else {
            const response = await fetch(url, {
              method: 'PATCH',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
              body: requestBody,
            });
            ok = response.ok;
            payload = (await response.json().catch(() => null)) as { error?: string; user?: { username: string; isPriviledge: boolean } } | null;
          }
        }
      }

      if (!ok || !payload) {
        throw new Error(payload?.error || 'Failed to update privilege.');
      }

      setData((previous) => {
        if (!previous) return previous;
        const users = previous.users.map((user) => {
          if (user.username !== targetUsername) return user;
          const nextStatus = isPriviledge
            ? 'privileged'
            : user.paymentCompleted
            ? user.expiresAt && Date.parse(user.expiresAt) > Date.now()
              ? 'active'
              : 'expired'
            : 'not-purchased';
          return {
            ...user,
            isPriviledge,
            desktopStatus: nextStatus,
          };
        });

        return {
          ...previous,
          users,
          totals: recalculateTotals(users),
        };
      });
    } catch (err) {
      setError(describeUnknownError(err, 'Failed to update privilege.'));
    } finally {
      setUpdatingPrivilegeFor(null);
    }
  };

  const handleRefreshCloudSignIn = async () => {
    setRefreshingSession(true);
    setError(null);
    try {
      const refreshed = await ensureCloudSession();
      if (!refreshed.success) {
        setError(refreshed.message || 'Your cloud admin session expired. Redirecting to sign in.');
        await signOut();
        return;
      }
      await fetchUsers();
    } catch (err) {
      setError(describeUnknownError(err, 'Failed to refresh cloud sign-in.'));
    } finally {
      setRefreshingSession(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    const users = data?.users || [];
    if (!term) return users;
    return users.filter((user) => {
      return (
        user.username.includes(term) ||
        (user.email || '').includes(term) ||
        (user.isPriviledge ? 'privileged' : '').includes(term) ||
        statusLabel(user.desktopStatus).toLowerCase().includes(term) ||
        (user.paymentProvider || '').includes(term)
      );
    });
  }, [data?.users, query]);

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>This page is restricted to admin users.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">View every registered user and the current desktop purchase state.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search username, email, provider" />
          </div>
          <Button variant="outline" onClick={() => void handleRefreshCloudSignIn()} disabled={loading || refreshingSession}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshingSession ? 'animate-spin' : ''}`} />
            Refresh Cloud Sign-In
          </Button>
          <Button variant="outline" onClick={() => void fetchUsers()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void handleRefreshCloudSignIn()} disabled={loading || refreshingSession}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshingSession ? 'animate-spin' : ''}`} />
              Refresh Cloud Sign-In
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Total Users</CardDescription>
            <CardTitle>{data?.totals.totalUsers || 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Last updated: {lastUpdated || 'Not loaded'}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Privileged Users</CardDescription>
            <CardTitle>{data?.totals.privilegedUsers || 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4" />
            Users who bypass desktop purchase checks.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active Purchases</CardDescription>
            <CardTitle>{data?.totals.activePurchases || 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Users currently allowed in the desktop app.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Expired Purchases</CardDescription>
            <CardTitle>{data?.totals.expiredPurchases || 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-4 w-4 text-amber-500" />
            Users who bought before but need renewal.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Storage</CardDescription>
            <CardTitle>{data?.storageConfigured === false ? 'Not configured' : 'Configured'}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4" />
            {data?.totals.noPurchase || 0} users have not purchased desktop access yet.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>Purchase state is sourced from the desktop entitlement table and linked by username.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Privileged</TableHead>
                <TableHead>Purchase</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Purchased On</TableHead>
                <TableHead>Expires On</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {loading ? 'Loading users...' : 'No users matched the current filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.username}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={user.isPriviledge}
                          onCheckedChange={(checked) => void updatePrivilege(user.username, checked)}
                          disabled={updatingPrivilegeFor === user.username}
                        />
                        <span className="text-xs text-muted-foreground">{user.isPriviledge ? 'Enabled' : 'Off'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(user.desktopStatus)}>{statusLabel(user.desktopStatus)}</Badge>
                    </TableCell>
                    <TableCell>{user.paymentProvider || 'N/A'}</TableCell>
                    <TableCell>{formatDate(user.purchaseDate)}</TableCell>
                    <TableCell>{formatDate(user.expiresAt)}</TableCell>
                    <TableCell>{formatDateTime(user.registeredAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AuthGuard>
      <AdminUsersPageContent />
    </AuthGuard>
  );
}