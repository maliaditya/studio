"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Heart, IndianRupee, RefreshCw, Search, Users } from 'lucide-react';

import { AuthGuard } from '@/components/AuthGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUsername } from '@/lib/adminUsers';
import { describeUnknownError } from '@/lib/errorMessage';
import { getAccessToken } from '@/lib/localAuth';

type DonorRecord = {
  id: string;
  username: string | null;
  email: string | null;
  sessionId: string;
  provider: 'razorpay' | 'upi' | 'paypal' | 'buymeacoffee';
  providerPaymentId: string | null;
  providerOrderId: string | null;
  amountInr: number;
  currency: string;
  status: 'started' | 'completed' | 'failed';
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
};

type DonorsResponse = {
  donors: DonorRecord[];
  totals: {
    totalDonations: number;
    completedDonations: number;
    pendingDonations: number;
    uniqueDonors: number;
    totalRevenueInr: number;
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

const amountFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const statusLabel = (status: DonorRecord['status']) => {
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  return 'Started';
};

const statusVariant = (status: DonorRecord['status']) => {
  if (status === 'completed') return 'default' as const;
  return 'secondary' as const;
};

function AdminDonorsPageContent() {
  const { currentUser, ensureCloudSession, signOut } = useAuth();
  const [data, setData] = useState<DonorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const isAdmin = useMemo(() => isAdminUsername(currentUser?.username), [currentUser?.username]);

  const fetchDonors = async () => {
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
      const localUrl = '/api/admin/donors';
      const url = cloudBase ? `${cloudBase.replace(/\/$/, '')}/api/admin/donors` : localUrl;
      const shouldUseDesktopProxy =
        Boolean((window as any)?.studioDesktop?.isDesktop) &&
        Boolean(cloudBase) &&
        typeof window !== 'undefined' &&
        !url.startsWith(window.location.origin);

      let ok = false;
      let payload: DonorsResponse | null = null;

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
          throw new Error(describeUnknownError(proxied?.error, 'Failed to call donors API.'));
        }
        ok = Boolean(proxied.ok);
        payload = (proxied.data || null) as DonorsResponse | null;
      } else {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        ok = response.ok;
        payload = (await response.json().catch(() => null)) as DonorsResponse | null;
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
              throw new Error(describeUnknownError(proxied?.error, 'Failed to call donors API.'));
            }
            ok = Boolean(proxied.ok);
            payload = (proxied.data || null) as DonorsResponse | null;
          } else {
            const response = await fetch(url, {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
              headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            });
            ok = response.ok;
            payload = (await response.json().catch(() => null)) as DonorsResponse | null;
          }
        }
      }

      if (!ok || !payload) {
        throw new Error(payload?.error || 'Failed to load donors.');
      }

      setData(payload);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(describeUnknownError(err, 'Failed to load donors.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void fetchDonors();
  }, [isAdmin]);

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
      await fetchDonors();
    } catch (err) {
      setError(describeUnknownError(err, 'Failed to refresh cloud sign-in.'));
    } finally {
      setRefreshingSession(false);
    }
  };

  const filteredDonors = useMemo(() => {
    const term = query.trim().toLowerCase();
    const donors = data?.donors || [];
    if (!term) return donors;
    return donors.filter((donor) => {
      return (
        (donor.username || '').includes(term) ||
        (donor.email || '').includes(term) ||
        donor.provider.includes(term) ||
        statusLabel(donor.status).toLowerCase().includes(term) ||
        (donor.providerPaymentId || '').toLowerCase().includes(term)
      );
    });
  }, [data?.donors, query]);

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
          <h1 className="text-3xl font-bold tracking-tight">Donors</h1>
          <p className="text-sm text-muted-foreground">View every recorded support donation and donor identity when available.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search donor, email, provider" />
          </div>
          <Button variant="outline" onClick={() => void handleRefreshCloudSignIn()} disabled={loading || refreshingSession}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshingSession ? 'animate-spin' : ''}`} />
            Refresh Cloud Sign-In
          </Button>
          <Button variant="outline" onClick={() => void fetchDonors()} disabled={loading}>
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
            <CardDescription>Total Donations</CardDescription>
            <CardTitle>{data?.totals.totalDonations || 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Last updated: {lastUpdated || 'Not loaded'}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle>{data?.totals.completedDonations || 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Heart className="h-4 w-4 text-rose-500" />
            Verified support payments.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending</CardDescription>
            <CardTitle>{data?.totals.pendingDonations || 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Started sessions that have not completed yet.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Unique Donors</CardDescription>
            <CardTitle>{data?.totals.uniqueDonors || 0}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4" />
            Based on username, email, payment id, or session id.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle>{amountFormatter.format(data?.totals.totalRevenueInr || 0)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <IndianRupee className="h-4 w-4" />
            Completed donation amount only.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Donation Records</CardTitle>
          <CardDescription>Each row represents one support payment session recorded in the donations table.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Payment Id</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDonors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {loading ? 'Loading donors...' : 'No donors matched the current filter.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDonors.map((donor) => (
                  <TableRow key={donor.id}>
                    <TableCell className="font-medium">{donor.username || 'Guest'}</TableCell>
                    <TableCell>{donor.email || 'N/A'}</TableCell>
                    <TableCell>{amountFormatter.format(donor.amountInr || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(donor.status)}>{statusLabel(donor.status)}</Badge>
                    </TableCell>
                    <TableCell>{donor.provider}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{donor.providerPaymentId || donor.sessionId}</TableCell>
                    <TableCell>{formatDateTime(donor.completedAt)}</TableCell>
                    <TableCell>{formatDateTime(donor.createdAt)}</TableCell>
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

export default function AdminDonorsPage() {
  return (
    <AuthGuard>
      <AdminDonorsPageContent />
    </AuthGuard>
  );
}