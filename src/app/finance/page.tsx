"use client";

import React, { useCallback, useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowRight, Briefcase, CalendarClock, CircleDollarSign, CreditCard, Landmark, PiggyBank, RefreshCw, Target } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Offer, Project, Release } from "@/types/workout";

type FinanceOfferRow = {
  specializationId: string;
  specializationName: string;
  offer: Offer;
  numericPrice: number | null;
};

type FinanceReleaseRow = {
  specializationId: string;
  specializationName: string;
  release: Release;
  linkedProject: Project | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "Not set";
  return currencyFormatter.format(value);
};

const parsePrice = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!normalized) return null;
  const parsed = Number(normalized[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "No date";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
};

const getSpecializationName = (skills: { id: string; name: string }[], specializationId: string) => {
  return skills.find((skill) => skill.id === specializationId)?.name || `Specialization ${specializationId}`;
};

function FinancePageContent() {
  const { coreSkills, offerizationPlans, projects, skillAcquisitionPlans, settings, schedule, setSettings } = useAuth();

  const specializations = useMemo(
    () => coreSkills.filter((skill) => skill.type === "Specialization"),
    [coreSkills]
  );

  const offerRows = useMemo<FinanceOfferRow[]>(() => {
    return Object.entries(offerizationPlans || {}).flatMap(([specializationId, plan]) => {
      const specializationName = getSpecializationName(specializations, specializationId);
      return (plan?.offers || []).map((offer) => ({
        specializationId,
        specializationName,
        offer,
        numericPrice: parsePrice(offer.price),
      }));
    });
  }, [offerizationPlans, specializations]);

  const releaseRows = useMemo<FinanceReleaseRow[]>(() => {
    return Object.entries(offerizationPlans || {}).flatMap(([specializationId, plan]) => {
      const specializationName = getSpecializationName(specializations, specializationId);
      return (plan?.releases || []).map((release) => ({
        specializationId,
        specializationName,
        release,
        linkedProject: projects.find((project) => project.name === release.name) || null,
      }));
    });
  }, [offerizationPlans, projects, specializations]);

  const totalProjectedOfferValue = useMemo(
    () => offerRows.reduce((sum, row) => sum + (row.numericPrice || 0), 0),
    [offerRows]
  );

  const capitalPlans = useMemo(() => {
    const learningRows = (skillAcquisitionPlans || [])
      .filter((plan) => typeof plan.requiredMoney === "number" && plan.requiredMoney > 0)
      .map((plan) => ({
        id: `skill-${plan.specializationId}`,
        name: getSpecializationName(specializations, plan.specializationId),
        amount: plan.requiredMoney || 0,
        targetDate: plan.targetDate,
        kind: "Skill plan",
      }));

    const projectRows = (projects || [])
      .filter((project) => typeof project.productPlan?.requiredMoney === "number" && (project.productPlan?.requiredMoney || 0) > 0)
      .map((project) => ({
        id: `project-${project.id}`,
        name: project.name,
        amount: project.productPlan?.requiredMoney || 0,
        targetDate: project.productPlan?.targetDate || "",
        kind: "Project build",
      }));

    return [...learningRows, ...projectRows].sort((a, b) => b.amount - a.amount);
  }, [projects, skillAcquisitionPlans, specializations]);

  const totalCapitalRequired = useMemo(
    () => capitalPlans.reduce((sum, row) => sum + row.amount, 0),
    [capitalPlans]
  );

  const upcomingReleases = useMemo(
    () =>
      [...releaseRows]
        .sort((a, b) => {
          if (!a.release.launchDate) return 1;
          if (!b.release.launchDate) return -1;
          return a.release.launchDate.localeCompare(b.release.launchDate);
        })
        .slice(0, 6),
    [releaseRows]
  );

  const averageOfferValue = offerRows.length > 0 ? totalProjectedOfferValue / offerRows.length : 0;

  const routineCashflow = useMemo(() => {
    const routines = settings.routines || [];
    const totals = routines.reduce(
      (acc, routine) => {
        const income = typeof routine.costIn === "number" ? routine.costIn : 0;
        const out = typeof routine.costOut === "number" ? routine.costOut : typeof routine.cost === "number" ? routine.cost : 0;
        acc.income += income;
        acc.out += out;
        return acc;
      },
      { income: 0, out: 0 }
    );
    return {
      income: totals.income,
      out: totals.out,
      net: totals.income - totals.out,
    };
  }, [settings.routines]);

  const debtBalance = useMemo(() => {
    const value = settings.debtBalance ?? 0;
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }, [settings.debtBalance]);

  const monthlyIncome = useMemo(() => {
    const value = settings.financeMonthlyIncome ?? 0;
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }, [settings.financeMonthlyIncome]);

  const monthlyOutflow = useMemo(() => {
    const value = settings.financeMonthlyOutflow ?? 0;
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }, [settings.financeMonthlyOutflow]);

  const netBalance = useMemo(() => {
    const value = settings.financeNetBalance ?? 0;
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }, [settings.financeNetBalance]);

  const recalculateFinanceFromTasks = useCallback(() => {
    const normalize = (value?: string) => (value || "").trim().toLowerCase().replace(/\s+/g, " ");
    const getLabel = (value?: string) => {
      const raw = normalize(value);
      const prefix = raw.split(":")[0]?.trim() || raw;
      return prefix;
    };
    const now = new Date();
    const monthKey = format(now, "yyyy-MM");

    let monthlyIncomeTotal = 0;
    let monthlyOutflowTotal = 0;
    let netTotal = 0;
    let debtTotal = 0;

    Object.entries(schedule || {}).forEach(([dateKey, day]) => {
      const isCurrentMonth = dateKey.startsWith(monthKey);
      Object.values(day || {}).forEach((slot) => {
        if (!Array.isArray(slot)) return;
        slot.forEach((activity) => {
          if (!activity || !activity.completed) return;
          const label = getLabel(activity.details);
          const costIn = typeof activity.costIn === "number" ? activity.costIn : null;
          const costOut =
            typeof activity.costOut === "number"
              ? activity.costOut
              : typeof activity.cost === "number"
                ? activity.cost
                : null;

          if (costIn !== null) {
            if (isCurrentMonth) monthlyIncomeTotal += costIn;
            netTotal += costIn;
          }
          if (costOut !== null) {
            if (isCurrentMonth && label !== "debt") monthlyOutflowTotal += costOut;
            if (label === "debt") {
              debtTotal += costOut;
              netTotal += costOut;
            } else if (label === "emi") {
              debtTotal = Math.max(0, debtTotal - costOut);
              netTotal -= costOut;
            } else {
              netTotal -= costOut;
            }
          }
        });
      });
    });

    setSettings((prev) => ({
      ...prev,
      financeMonthKey: monthKey,
      financeMonthlyIncome: monthlyIncomeTotal,
      financeMonthlyOutflow: monthlyOutflowTotal,
      financeNetBalance: Math.max(0, netTotal),
      debtBalance: Math.max(0, debtTotal),
    }));
  }, [schedule, setSettings]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge variant="secondary" className="w-fit">Finance</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            A single view of monetization potential, required capital, and release timing across your current strategy data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/strategic-planning">
              Open Strategy
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/monetization">
              Monetization Admin
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Projected Offer Value</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CircleDollarSign className="h-5 w-5 text-emerald-400" />
              {formatCurrency(totalProjectedOfferValue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Based on {offerRows.length} priced offers currently defined.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Offer Price</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Landmark className="h-5 w-5 text-sky-400" />
              {offerRows.length > 0 ? formatCurrency(Math.round(averageOfferValue)) : "No offers"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Useful for checking whether your offer mix is too low-ticket or too top-heavy.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Capital Required</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <PiggyBank className="h-5 w-5 text-amber-400" />
              {formatCurrency(totalCapitalRequired)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Combined money requirements from learning plans and project product plans.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Release Pipeline</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Target className="h-5 w-5 text-violet-400" />
              {releaseRows.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Releases tracked across all offerization plans.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Finance Structure</CardTitle>
          <CardDescription>How the money system is organized across your stack.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Input</p>
            <p className="mt-2 text-sm text-foreground">Income sources</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allocation</p>
            <p className="mt-2 text-sm text-foreground">Spending</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saving</p>
            <p className="mt-2 text-sm text-foreground">Reserved capital</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Debt</p>
            <p className="mt-2 text-sm text-foreground">Obligations &amp; liabilities</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Balance</p>
            <p className="mt-2 text-sm text-foreground">Net position</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardDescription>Routine Income</CardDescription>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={recalculateFinanceFromTasks}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CircleDollarSign className="h-5 w-5 text-emerald-400" />
              {formatCurrency(monthlyIncome)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sum of all routine task Cost In values.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardDescription>Routine Outflow</CardDescription>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={recalculateFinanceFromTasks}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <PiggyBank className="h-5 w-5 text-amber-400" />
              {formatCurrency(monthlyOutflow)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sum of all routine task Cost Out values this month.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardDescription>Debt Balance</CardDescription>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={recalculateFinanceFromTasks}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CreditCard className="h-5 w-5 text-rose-400" />
              {formatCurrency(debtBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Added by Debt tasks, reduced by EMI logs.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardDescription>Routine Net</CardDescription>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={recalculateFinanceFromTasks}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Target className="h-5 w-5 text-violet-400" />
              {formatCurrency(netBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Running net that does not reset each month.
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarClock className="h-5 w-5 text-sky-400" />
              Upcoming Releases
            </CardTitle>
            <CardDescription>The next launches currently on your roadmap.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingReleases.length > 0 ? (
              upcomingReleases.map((row) => (
                <div key={`${row.specializationId}-${row.release.id}`} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.release.name}</p>
                      <p className="text-xs text-muted-foreground">{row.specializationName}</p>
                    </div>
                    <Badge variant="outline">{formatDate(row.release.launchDate)}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {row.linkedProject ? `Linked project: ${row.linkedProject.name}` : "No linked project yet"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No releases are scheduled yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PiggyBank className="h-5 w-5 text-amber-400" />
              Capital Requirements
            </CardTitle>
            <CardDescription>Where your current plans say money is needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {capitalPlans.length > 0 ? (
              capitalPlans.slice(0, 8).map((row) => (
                <div key={row.id} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.kind}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(row.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(row.targetDate)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No explicit capital requirements have been added yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FinancePage() {
  return (
    <AuthGuard>
      <FinancePageContent />
    </AuthGuard>
  );
}
