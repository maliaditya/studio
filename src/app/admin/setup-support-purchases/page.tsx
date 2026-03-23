"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, IndianRupee, RefreshCw, Search, ShoppingBag, Users } from 'lucide-react';

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

type PurchaseRecord = {
  id: string;
  username: string | null;
  email: string | null;
  sessionId: string;
  planId: string | null;
  planHeading: string | null;
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

type PurchasesResponse = {
  purchases: PurchaseRecord[];
  totals: {
    totalPurchases: number;
    uniqueBuyers: number;
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

function AdminSetupSupportPurchasesPageContent() {
  const { currentUser, ensureCloudSession, signOut } = useAuth();
  const [data, setData] = useState<PurchasesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const isAdmin = useMemo(() => isAdminUsername(currentUser?.username), [currentUser?.username]);

  const fetchPurchases = async () => {
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
      const localUrl = '/api/admin/setup-support-purchases';
      const url = cloudBase ? `${cloudBase.replace(/\/$/, '')}/api/admin/setup-support-purchases` : localUrl;
      const shouldUseDesktopProxy =
        Boolean((window as any)?.studioDesktop?.isDesktop) &&
        Boolean(cloudBase) &&
        typeof window !== 'undefined' &&
        !url.startsWith(window.location.origin);

      let ok = false;
      let payload: PurchasesResponse | null = null;

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
          throw new Error(describeUnknownError(proxied?.error, 'Failed to call setup/support purchases API.'));
        }
        ok = Boolean(proxied.ok);
        payload = (proxied.data || null) as PurchasesResponse | null;
      } else {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        ok = response.ok;
        payload = (await response.json().catch(() => null)) as PurchasesResponse | null;
      }

      if (!ok || !payload) {
        throw new Error(payload?.error || 'Failed to load setup/support purchases.');
      }

      setData(payload);
    } catch (err) {
      setError(describeUnknownError(err, 'Failed to load setup/support purchases.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void fetchPurchases();
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
      await fetchPurchases();
    } catch (err) {
      setError(describeUnknownError(err, 'Failed to refresh cloud sign-in.'));
    } finally {
      setRefreshingSession(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    const term = query.trim().toLowerCase();
    const purchases = data?.purchases || [];
    if (!term) return purchases;
    return purchases.filter((purchase) => {
      return (
        (purchase.planHeading || '').toLowerCase().includes(term) ||
        (purchase.username || '').toLowerCase().includes(term) ||
        (purchase.email || '').toLowerCase().includes(term) ||
        (purchase.providerPaymentId || '').toLowerCase().includes(term)
      );
    });
  }, [data?.purchases, query]);

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
          <h1 className="text-3xl font-bold tracking-tight">Setup & Support Purchases</h1>
          <p className="text-sm text-muted-foreground">View purchased setup/support plans, buyer identity, and purchase dates.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search plan, username, email" />
          </div>
          <Button variant="outline" onClick={() => void handleRefreshCloudSignIn()} disabled={loading || refreshingSession}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshingSession ? 'animate-spin' : ''}`} />
            Refresh Cloud Sign-In
          </Button>
          <Button variant="outline" onClick={() => void fetchPurchases()} disabled={loading}>
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
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Purchases</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShoppingBag className="h-5 w-5 text-primary" />
              {data?.totals.totalPurchases || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unique Buyers</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-5 w-5 text-primary" />
              {data?.totals.uniqueBuyers || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <IndianRupee className="h-5 w-5 text-primary" />
              {amountFormatter.format(data?.totals.totalRevenueInr || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchased Plans</CardTitle>
          <CardDescription>Completed setup/support plan purchases only.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {loading ? 'Loading purchases...' : 'No setup/support plan purchases found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{purchase.planHeading || 'Unnamed plan'}</div>
                      {purchase.planId ? <div className="text-xs text-muted-foreground">{purchase.planId}</div> : null}
                    </TableCell>
                    <TableCell>{purchase.username || 'N/A'}</TableCell>
                    <TableCell>{purchase.email || 'N/A'}</TableCell>
                    <TableCell>{amountFormatter.format(purchase.amountInr)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDateTime(purchase.completedAt || purchase.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{purchase.provider}</Badge>
                    </TableCell>
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

export default function AdminSetupSupportPurchasesPage() {
  return (
    <AuthGuard>
      <AdminSetupSupportPurchasesPageContent />
    </AuthGuard>
  );
}