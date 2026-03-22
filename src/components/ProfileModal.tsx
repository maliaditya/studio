"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, User as UserIcon } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { DesktopAccessState } from '@/lib/desktopAccess';
import { getAccessToken, persistCurrentLocalUserProfile } from '@/lib/localAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PurchaseStatus = {
  status: 'active' | 'expired' | 'not-purchased';
  paymentCompleted: boolean;
  purchaseDate: string | null;
  expiresAt: string | null;
  paymentProvider: 'razorpay' | 'upi' | 'paypal' | null;
};

type ProfileResponse = {
  profile: {
    username: string;
    email: string | null;
  };
  purchaseStatus: PurchaseStatus;
  error?: string;
};

const formatDate = (value: string | null) => {
  if (!value) return 'N/A';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'N/A';
  return new Date(parsed).toLocaleDateString();
};

const purchaseLabel = (status: PurchaseStatus['status']) => {
  if (status === 'active') return 'Active';
  if (status === 'expired') return 'Expired';
  return 'Not purchased';
};

const purchaseIcon = (status: PurchaseStatus['status']) => {
  if (status === 'active') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'expired') return <Clock3 className="h-4 w-4 text-amber-500" />;
  return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
};

const toPurchaseStatusFromDesktopAccess = (desktopAccess: DesktopAccessState): PurchaseStatus => {
  if (!desktopAccess.grantedAt) {
    return {
      status: 'not-purchased',
      paymentCompleted: false,
      purchaseDate: null,
      expiresAt: null,
      paymentProvider: null,
    };
  }

  const expiresAtMs = desktopAccess.expiresAt ? Date.parse(desktopAccess.expiresAt) : Number.NaN;
  const isActive = desktopAccess.hasAccess && (!Number.isFinite(expiresAtMs) || expiresAtMs > Date.now());

  return {
    status: isActive ? 'active' : 'expired',
    paymentCompleted: true,
    purchaseDate: desktopAccess.grantedAt,
    expiresAt: desktopAccess.expiresAt,
    paymentProvider: desktopAccess.activeProvider,
  };
};

interface ProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ isOpen, onOpenChange }: ProfileModalProps) {
  const { currentUser, desktopAccess, ensureCloudSession } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setUsername(currentUser?.username || '');
    setEmail(currentUser?.email || '');
    setPurchaseStatus(toPurchaseStatusFromDesktopAccess(desktopAccess));

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const username = (currentUser?.username || '').trim().toLowerCase();
        if (!username) {
          throw new Error('No signed-in user is available for this profile.');
        }

        let accessToken = username ? getAccessToken(username) : null;
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 8000);

        const doFetch = async (token?: string | null) => {
          return await fetch('/api/account/profile', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
          });
        };

        let response = await doFetch(accessToken);
        let result = (await response.json().catch(() => null)) as ProfileResponse | null;

        if (response.status === 401 && username) {
          const refreshed = await ensureCloudSession();
          if (refreshed.success) {
            accessToken = getAccessToken(username);
            response = await doFetch(accessToken);
            result = (await response.json().catch(() => null)) as ProfileResponse | null;
          }
        }

        window.clearTimeout(timeoutId);

        if (!response.ok || !result) {
          throw new Error(result?.error || 'Failed to load profile.');
        }

        setUsername(result.profile.username || currentUser?.username || '');
        setEmail(result.profile.email || '');
        setPurchaseStatus(result.purchaseStatus);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Profile details are taking too long to load from the server. Showing local details for now.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load profile.');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [currentUser?.email, currentUser?.username, desktopAccess, ensureCloudSession, isOpen]);

  const handleSave = async () => {
    setError(null);
    if (!currentPassword.trim()) {
      setError('Current password is required to save profile changes.');
      return;
    }
    if (newPassword && newPassword !== confirmNewPassword) {
      setError('New password and confirm password must match.');
      return;
    }

    setSaving(true);
    try {
      const normalizedUsername = (currentUser?.username || username || '').trim().toLowerCase();
      let accessToken = normalizedUsername ? getAccessToken(normalizedUsername) : null;

      let response = await fetch('/api/account/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          username,
          email,
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });

      let result = (await response.json().catch(() => null)) as (ProfileResponse & { success?: boolean; message?: string; error?: string }) | null;

      if (response.status === 401 && normalizedUsername) {
        const refreshed = await ensureCloudSession();
        if (refreshed.success) {
          accessToken = getAccessToken(normalizedUsername);
          response = await fetch('/api/account/profile', {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({
              username,
              email,
              currentPassword,
              newPassword: newPassword || undefined,
            }),
          });
          result = (await response.json().catch(() => null)) as (ProfileResponse & { success?: boolean; message?: string; error?: string }) | null;
        }
      }

      if (!response.ok || !result) {
        throw new Error(result?.error || 'Failed to update profile.');
      }

      setEmail(result.profile.email || '');
      persistCurrentLocalUserProfile({
        username: result.profile.username,
        ...(result.profile.email ? { email: result.profile.email } : {}),
      });
      setPurchaseStatus(result.purchaseStatus);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast({ title: 'Profile updated', description: result.message || 'Your account details were updated.' });
      onOpenChange(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>
            Review your account, update email or password, and check your desktop purchase status.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {error && (
              <Card className="border-destructive/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-destructive text-base">Error</CardTitle>
                  <CardDescription>{error}</CardDescription>
                </CardHeader>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="profile-username">Username</Label>
              <Input id="profile-username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={loading || saving} />
              <p className="text-xs text-muted-foreground">
                Username changes are visible here, but saving a different username is not enabled yet because synced app data is currently keyed by username.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading || saving} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-current-password">Current Password</Label>
              <Input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={loading || saving}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-new-password">New Password</Label>
                <Input
                  id="profile-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-confirm-new-password">Confirm New Password</Label>
                <Input
                  id="profile-confirm-new-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  disabled={loading || saving}
                />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-4 w-4" />
                Purchase Status
              </CardTitle>
              <CardDescription>Your current desktop entitlement.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <span className="flex items-center gap-2">
                  {purchaseStatus ? purchaseIcon(purchaseStatus.status) : null}
                  <Badge variant={purchaseStatus?.status === 'active' ? 'default' : 'secondary'}>
                    {purchaseStatus ? purchaseLabel(purchaseStatus.status) : 'Loading'}
                  </Badge>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Provider</span>
                <span className="text-muted-foreground">{purchaseStatus?.paymentProvider || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Purchased On</span>
                <span className="text-muted-foreground">{formatDate(purchaseStatus?.purchaseDate || null)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Expires On</span>
                <span className="text-muted-foreground">{formatDate(purchaseStatus?.expiresAt || null)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Close</Button>
          <Button onClick={() => void handleSave()} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}