"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchAppConfig, saveAppConfig, type AppConfigPayload } from "@/lib/appConfigClient";
import {
  createDefaultDesktopPlanCatalog,
  DESKTOP_PLAN_TAX_MODE_LABELS,
  DESKTOP_PLAN_VALIDITY_LABELS,
  getDesktopPlanFinalPriceInr,
  getFeaturedDesktopPlan,
  normalizeDesktopPlanCatalog,
  type DesktopPlanDefinition,
  type DesktopPlanFeature,
  type DesktopPlanTaxMode,
  type DesktopPlanValidity,
} from "@/lib/desktopPlans";
import {
  createDefaultSetupSupportPlanCatalog,
  normalizeSetupSupportPlanCatalog,
  type SetupSupportFeature,
  type SetupSupportPlanDefinition,
} from "@/lib/setupSupportPlans";
import { describeUnknownError } from "@/lib/errorMessage";
import { getAccessToken } from "@/lib/localAuth";
import { isAdminUsername } from "@/lib/adminUsers";

function AdminConfigPageContent() {
  const { currentUser, setSettings, ensureCloudSession, signOut } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfigPayload | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseStorageBucket, setSupabaseStorageBucket] = useState("");
  const [desktopPlanFeatures, setDesktopPlanFeatures] = useState<DesktopPlanFeature[]>(createDefaultDesktopPlanCatalog().features);
  const [desktopPlans, setDesktopPlans] = useState<DesktopPlanDefinition[]>(createDefaultDesktopPlanCatalog().plans);
  const [setupSupportFeatures, setSetupSupportFeatures] = useState<SetupSupportFeature[]>(createDefaultSetupSupportPlanCatalog().features);
  const [setupSupportPlans, setSetupSupportPlans] = useState<SetupSupportPlanDefinition[]>(createDefaultSetupSupportPlanCatalog().plans);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshingSession, setRefreshingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    return isAdminUsername(currentUser?.username);
  }, [currentUser?.username]);

  const featuredPlan = useMemo(() => {
    return getFeaturedDesktopPlan({ features: desktopPlanFeatures, plans: desktopPlans });
  }, [desktopPlanFeatures, desktopPlans]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppConfig();
      setConfig(data);
      setSupabaseUrl(data.supabaseUrl || "");
      setSupabaseAnonKey(data.supabaseAnonKey || "");
      setSupabaseStorageBucket(data.supabaseStorageBucket || "");
      const catalog = normalizeDesktopPlanCatalog(data.desktopPlans, data.desktopPlanPriceInr || 799);
      const setupSupportCatalog = normalizeSetupSupportPlanCatalog(data.setupSupportPlans);
      setDesktopPlanFeatures(catalog.features);
      setDesktopPlans(catalog.plans);
      setSetupSupportFeatures(setupSupportCatalog.features);
      setSetupSupportPlans(setupSupportCatalog.plans);
      return data;
    } catch (err) {
      setError(describeUnknownError(err, "Failed to load config."));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addPlanFeature = () => {
    setDesktopPlanFeatures((prev) => [...prev, { id: `feature_${Date.now()}_${prev.length + 1}`, label: "" }]);
  };

  const updatePlanFeature = (featureId: string, updates: Partial<DesktopPlanFeature>) => {
    setDesktopPlanFeatures((prev) => prev.map((feature) => (feature.id === featureId ? { ...feature, ...updates } : feature)));
  };

  const removePlanFeature = (featureId: string) => {
    setDesktopPlanFeatures((prev) => prev.filter((feature) => feature.id !== featureId));
    setDesktopPlans((prev) => prev.map((plan) => ({
      ...plan,
      featureIds: plan.featureIds.filter((id) => id !== featureId),
    })));
  };

  const addDesktopPlan = () => {
    setDesktopPlans((prev) => [
      ...prev,
      {
        id: `plan_${Date.now()}_${prev.length + 1}`,
        heading: "New Plan",
        description: "Describe what the buyer gets in this plan.",
        recommended: false,
        visible: true,
        priceInr: featuredPlan?.priceInr || 799,
        compareAtPriceInr: null,
        taxMode: 'inclusive',
        gstPercent: 18,
        validity: 'yearly',
        billingLabel: "yearly",
        featureIds: [],
      },
    ]);
  };

  const updateDesktopPlan = (planId: string, updates: Partial<DesktopPlanDefinition>) => {
    setDesktopPlans((prev) => prev.map((plan) => {
      if (plan.id !== planId) return plan;
      return { ...plan, ...updates };
    }));
  };

  const togglePlanRecommendation = (planId: string, checked: boolean) => {
    setDesktopPlans((prev) => prev.map((plan) => ({
      ...plan,
      recommended: checked ? plan.id === planId : plan.id === planId ? false : plan.recommended,
    })));
  };

  const togglePlanFeature = (planId: string, featureId: string, checked: boolean) => {
    setDesktopPlans((prev) => prev.map((plan) => {
      if (plan.id !== planId) return plan;
      const nextFeatureIds = checked
        ? Array.from(new Set([...plan.featureIds, featureId]))
        : plan.featureIds.filter((id) => id !== featureId);
      return { ...plan, featureIds: nextFeatureIds };
    }));
  };

  const removeDesktopPlan = (planId: string) => {
    setDesktopPlans((prev) => prev.filter((plan) => plan.id !== planId));
  };

  const addSetupSupportFeature = () => {
    setSetupSupportFeatures((prev) => [...prev, { id: `setup_support_feature_${Date.now()}_${prev.length + 1}`, label: '' }]);
  };

  const updateSetupSupportFeature = (featureId: string, updates: Partial<SetupSupportFeature>) => {
    setSetupSupportFeatures((prev) => prev.map((feature) => (feature.id === featureId ? { ...feature, ...updates } : feature)));
  };

  const removeSetupSupportFeature = (featureId: string) => {
    setSetupSupportFeatures((prev) => prev.filter((feature) => feature.id !== featureId));
    setSetupSupportPlans((prev) => prev.map((plan) => ({
      ...plan,
      featureIds: plan.featureIds.filter((id) => id !== featureId),
    })));
  };

  const addSetupSupportPlan = () => {
    setSetupSupportPlans((prev) => [
      ...prev,
      {
        id: `setup_support_${Date.now()}_${prev.length + 1}`,
        heading: 'New Support Plan',
        description: 'Describe the setup or support help included in this plan.',
        priceInr: 999,
        durationLabel: '30 mins',
        ctaLabel: 'Book Now',
        featureIds: [],
        recommended: prev.length === 0,
      },
    ]);
  };

  const updateSetupSupportPlan = (planId: string, updates: Partial<SetupSupportPlanDefinition>) => {
    setSetupSupportPlans((prev) => prev.map((plan) => (plan.id === planId ? { ...plan, ...updates } : plan)));
  };

  const toggleSetupSupportRecommendation = (planId: string, checked: boolean) => {
    setSetupSupportPlans((prev) => prev.map((plan) => ({
      ...plan,
      recommended: checked ? plan.id === planId : plan.id === planId ? false : plan.recommended,
    })));
  };

  const removeSetupSupportPlan = (planId: string) => {
    setSetupSupportPlans((prev) => prev.filter((plan) => plan.id !== planId));
  };

  const toggleSetupSupportFeature = (planId: string, featureId: string, checked: boolean) => {
    setSetupSupportPlans((prev) => prev.map((plan) => {
      if (plan.id !== planId) return plan;
      const nextFeatureIds = checked
        ? Array.from(new Set([...plan.featureIds, featureId]))
        : plan.featureIds.filter((id) => id !== featureId);
      return { ...plan, featureIds: nextFeatureIds };
    }));
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadConfig();
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
      await loadConfig();
      toast({ title: 'Cloud Sign-In Refreshed', description: 'Admin cloud session is active again.' });
    } catch (err) {
      const message = describeUnknownError(err, 'Failed to refresh cloud sign-in.');
      setError(message);
      toast({ title: 'Refresh Failed', description: message, variant: 'destructive' });
    } finally {
      setRefreshingSession(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const username = (currentUser?.username || "").trim().toLowerCase();
      let accessToken = null as string | null;
      if (username) {
        const refreshed = await ensureCloudSession();
        if (!refreshed.success) {
          throw new Error(refreshed.message || "Your cloud admin session expired. Please sign in again.");
        }
        accessToken = getAccessToken(username);
      }
      const payload = await saveAppConfig(
        {
          supabaseUrl: supabaseUrl.trim(),
          supabaseAnonKey: supabaseAnonKey.trim(),
          supabaseStorageBucket: supabaseStorageBucket.trim() || null,
          desktopPlanPriceInr: featuredPlan.priceInr,
          desktopPlans: {
            features: desktopPlanFeatures,
            plans: desktopPlans,
          },
          setupSupportPlans: {
            features: setupSupportFeatures,
            plans: setupSupportPlans,
          },
        },
        accessToken
      );
      setConfig(payload);
      setSettings((prev) => ({
        ...prev,
        supabaseUrl: payload.supabaseUrl || prev.supabaseUrl,
        supabaseAnonKey: payload.supabaseAnonKey || prev.supabaseAnonKey,
        supabasePdfBucket: payload.supabaseStorageBucket || prev.supabasePdfBucket,
      }));
      const reloaded = await loadConfig();
      if (!reloaded) {
        toast({
          title: 'Saved, but reload failed',
          description: 'The config was saved, but the page could not verify the saved DB row. Check the fallback warning card.',
          variant: 'destructive',
        });
        return;
      }
      if (reloaded.source !== 'db' || reloaded.readError) {
        toast({
          title: 'Saved, but app is using fallback config',
          description: reloaded.readError || 'The save completed, but the app is still loading env/default values on refresh.',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: "Saved", description: "Supabase config, desktop plans, and setup/support plans updated for all apps." });
    } catch (err) {
      const message = describeUnknownError(err, "Failed to save config.");
      setError(message);
      toast({ title: "Save Failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="text-3xl font-bold tracking-tight">App Config</h1>
          <p className="text-sm text-muted-foreground">
            Update public Supabase settings used by web and desktop apps.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={() => void handleRefreshCloudSignIn()} disabled={loading || saving || refreshingSession}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshingSession ? "animate-spin" : ""}`} />
            Refresh Cloud Sign-In
          </Button>
          <Button variant="outline" onClick={() => void loadConfig()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
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
            <Button variant="outline" onClick={() => void handleRefreshCloudSignIn()} disabled={loading || saving || refreshingSession}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshingSession ? "animate-spin" : ""}`} />
              Refresh Cloud Sign-In
            </Button>
          </CardContent>
        </Card>
      )}

      {config?.readError && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="text-amber-400">Config Fallback Active</CardTitle>
            <CardDescription>
              The app is loading fallback env/default values instead of the saved database row.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {config.readError}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supabase Public Config</CardTitle>
          <CardDescription>Only public keys are stored here. Service role keys stay server-only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Supabase URL</label>
            <Input
              value={supabaseUrl}
              onChange={(event) => setSupabaseUrl(event.target.value)}
              placeholder="https://YOUR_PROJECT.supabase.co"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Supabase Anon Key</label>
            <Input
              type="password"
              value={supabaseAnonKey}
              onChange={(event) => setSupabaseAnonKey(event.target.value)}
              placeholder="sb_publishable_..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Supabase Storage Bucket</label>
            <Input
              value={supabaseStorageBucket}
              onChange={(event) => setSupabaseStorageBucket(event.target.value)}
              placeholder="dock-data"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desktop Plans</CardTitle>
          <CardDescription>
            Add plans, mark one as recommended, and define the shared feature list shown in the plans popup before payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            Featured plan on landing page: <span className="font-semibold text-foreground">{featuredPlan.heading}</span>
            <span className="text-foreground">
              {' '}
              (
              {featuredPlan.compareAtPriceInr && featuredPlan.compareAtPriceInr > featuredPlan.priceInr ? `${featuredPlan.compareAtPriceInr} INR -> ` : ''}
              {getDesktopPlanFinalPriceInr(featuredPlan)} INR / {featuredPlan.billingLabel})
            </span>
            {featuredPlan.validity === 'lifetime' ? (
              <span className="ml-2 text-emerald-400">Lifetime plans mark the buyer as privileged.</span>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Shared Feature List</h3>
                <p className="text-xs text-muted-foreground">Each plan can check or uncheck the same features.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addPlanFeature}>
                <Plus className="mr-2 h-4 w-4" />
                Add Feature
              </Button>
            </div>
            <div className="space-y-2">
              {desktopPlanFeatures.map((feature, index) => (
                <div key={feature.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2">
                  <span className="w-8 text-center text-xs text-muted-foreground">{index + 1}</span>
                  <Input
                    value={feature.label}
                    onChange={(event) => updatePlanFeature(feature.id, { label: event.target.value })}
                    placeholder="Feature label"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePlanFeature(feature.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Plans</h3>
                <p className="text-xs text-muted-foreground">These cards appear in the new plans step before desktop payment.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDesktopPlan}>
                <Plus className="mr-2 h-4 w-4" />
                Add Plan
              </Button>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {desktopPlans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Heading</label>
                        <Input
                          value={plan.heading}
                          onChange={(event) => updateDesktopPlan(plan.id, { heading: event.target.value })}
                          placeholder="Plan heading"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">What You Get</label>
                        <Textarea
                          value={plan.description}
                          onChange={(event) => updateDesktopPlan(plan.id, { description: event.target.value })}
                          placeholder="Short description shown under the heading"
                          className="min-h-[96px]"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Price (INR)</label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={String(plan.priceInr)}
                            onChange={(event) => updateDesktopPlan(plan.id, { priceInr: Number(event.target.value) || 0 })}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Original Price (INR)</label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={plan.compareAtPriceInr == null ? '' : String(plan.compareAtPriceInr)}
                            onChange={(event) => {
                              const value = event.target.value.trim();
                              updateDesktopPlan(plan.id, { compareAtPriceInr: value ? Number(value) || 0 : null });
                            }}
                            placeholder="1999"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Billing Label</label>
                          <Input
                            value={plan.billingLabel}
                            onChange={(event) => updateDesktopPlan(plan.id, { billingLabel: event.target.value })}
                            placeholder="yearly"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">GST Pricing Mode</label>
                          <Select
                            value={plan.taxMode}
                            onValueChange={(value) => {
                              updateDesktopPlan(plan.id, {
                                taxMode: value as DesktopPlanTaxMode,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select GST mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inclusive">Including GST</SelectItem>
                              <SelectItem value="exclusive">Excluding GST</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">GST %</label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={String(plan.gstPercent)}
                            onChange={(event) => updateDesktopPlan(plan.id, { gstPercent: Number(event.target.value) || 0 })}
                            disabled={plan.taxMode !== 'exclusive'}
                            placeholder="18"
                          />
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        {plan.taxMode === 'inclusive'
                          ? `Final price stays ${getDesktopPlanFinalPriceInr(plan)} INR because GST is already included.`
                          : `Final price becomes ${getDesktopPlanFinalPriceInr(plan)} INR after adding ${plan.gstPercent}% GST.`}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Validity</label>
                        <Select
                          value={plan.validity}
                          onValueChange={(value) => {
                            const nextValidity = value as DesktopPlanValidity;
                            updateDesktopPlan(plan.id, {
                              validity: nextValidity,
                              billingLabel: DESKTOP_PLAN_VALIDITY_LABELS[nextValidity],
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select validity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                            <SelectItem value="lifetime">Lifetime</SelectItem>
                          </SelectContent>
                        </Select>
                        {plan.validity === 'lifetime' ? (
                          <p className="text-xs text-emerald-400">Lifetime purchase will check privileged access for that user.</p>
                        ) : null}
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDesktopPlan(plan.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <Checkbox
                      id={`recommended-${plan.id}`}
                      checked={plan.recommended}
                      onCheckedChange={(checked) => togglePlanRecommendation(plan.id, Boolean(checked))}
                    />
                    <label htmlFor={`recommended-${plan.id}`} className="text-sm text-foreground">Recommended plan</label>
                  </div>

                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                    <Checkbox
                      id={`visible-${plan.id}`}
                      checked={plan.visible !== false}
                      onCheckedChange={(checked) => updateDesktopPlan(plan.id, { visible: Boolean(checked) })}
                    />
                    <label htmlFor={`visible-${plan.id}`} className="text-sm text-foreground">Visible in UI</label>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Feature Availability</p>
                    {desktopPlanFeatures.map((feature) => (
                      <div key={feature.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                        <span className="text-sm text-foreground">{feature.label || 'Untitled feature'}</span>
                        <Checkbox
                          checked={plan.featureIds.includes(feature.id)}
                          onCheckedChange={(checked) => togglePlanFeature(plan.id, feature.id, Boolean(checked))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup & Support Plans</CardTitle>
          <CardDescription>
            These plans appear when the user clicks the setup call button on the landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Support Plans</h3>
              <p className="text-xs text-muted-foreground">Add pricing and text for onboarding or support sessions. Checkout uses the same in-app Razorpay flow.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSetupSupportPlan}>
              <Plus className="mr-2 h-4 w-4" />
              Add Support Plan
            </Button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Shared What You Get List</h3>
                <p className="text-xs text-muted-foreground">Each setup/support plan can check or uncheck the same items.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSetupSupportFeature}>
                <Plus className="mr-2 h-4 w-4" />
                Add Feature
              </Button>
            </div>
            <div className="space-y-2">
              {setupSupportFeatures.map((feature, index) => (
                <div key={feature.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2">
                  <span className="w-8 text-center text-xs text-muted-foreground">{index + 1}</span>
                  <Input
                    value={feature.label}
                    onChange={(event) => updateSetupSupportFeature(feature.id, { label: event.target.value })}
                    placeholder="Feature label"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSetupSupportFeature(feature.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {setupSupportPlans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Heading</label>
                      <Input
                        value={plan.heading}
                        onChange={(event) => updateSetupSupportPlan(plan.id, { heading: event.target.value })}
                        placeholder="1:1 Setup Call"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">What You Get</label>
                      <Textarea
                        value={plan.description}
                        onChange={(event) => updateSetupSupportPlan(plan.id, { description: event.target.value })}
                        placeholder="Short description shown in the support plans dialog"
                        className="min-h-[96px]"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Price (INR)</label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={String(plan.priceInr)}
                          onChange={(event) => updateSetupSupportPlan(plan.id, { priceInr: Number(event.target.value) || 0 })}
                          placeholder="999"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Duration Label</label>
                        <Input
                          value={plan.durationLabel}
                          onChange={(event) => updateSetupSupportPlan(plan.id, { durationLabel: event.target.value })}
                          placeholder="30 mins"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Button Label</label>
                      <Input
                        value={plan.ctaLabel}
                        onChange={(event) => updateSetupSupportPlan(plan.id, { ctaLabel: event.target.value })}
                        placeholder="Pay with Razorpay"
                      />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                      <Checkbox
                        id={`setup-support-recommended-${plan.id}`}
                        checked={plan.recommended}
                        onCheckedChange={(checked) => toggleSetupSupportRecommendation(plan.id, Boolean(checked))}
                      />
                      <label htmlFor={`setup-support-recommended-${plan.id}`} className="text-xs text-muted-foreground">
                        Mark as recommended
                      </label>
                    </div>
                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">What You Get</p>
                      <div className="space-y-2">
                        {setupSupportFeatures.map((feature) => {
                          const checked = plan.featureIds.includes(feature.id);
                          return (
                            <label key={`${plan.id}:${feature.id}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => toggleSetupSupportFeature(plan.id, feature.id, Boolean(value))}
                              />
                              <span>{feature.label || 'Untitled feature'}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSetupSupportPlan(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Configuration source and last update timestamp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Storage Configured</span>
            <span className="flex items-center gap-2 text-foreground">
              {config?.storageConfigured === false ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Not configured
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Ready
                </>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Source</span>
            <span className="text-foreground">{config?.source || "unknown"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last Updated</span>
            <span className="text-foreground">
              {config?.updatedAt ? new Date(config.updatedAt).toLocaleString() : "N/A"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminConfigPage() {
  return (
    <AuthGuard>
      <AdminConfigPageContent />
    </AuthGuard>
  );
}
