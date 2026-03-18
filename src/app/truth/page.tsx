"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Check, CheckCircle2, ChevronDown, ChevronUp, Compass, Eye, Filter, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { CoreDomainId, Stopper } from "@/types/workout";
import { isBefore, startOfDay, subDays } from "date-fns";

type TruthRow = {
  impulseType: "" | "Urge" | "Resistance" | "Bothering";
  coreState?: "" | CoreDomainId;
  cells: [string, string, string, string, string, string];
  mechanismIds?: {
    negative?: string;
    positive?: string;
  };
  habitId?: string;
  patternId?: string;
  growthPatternId?: string;
  stopperId?: string;
  linkedBotherings?: Array<{
    id: string;
    type: "mismatch" | "constraint" | "external";
    status?: "pass" | "fail";
    why?: string;
  }>;
  resultStatus?: "" | "pass" | "fail";
};

type PatternLinkedStopper = {
  id: string;
  text: string;
  type: "urge" | "resistance";
  patternId: string;
  timestamps?: number[];
};

const TRUTH_PATTERN_STOPPERS_KEY = "truth_pattern_stoppers_v1";

const TRUTH_GRID_STORAGE_KEY = "truth_experiments_grid_v7";
const TRUTH_LOG_STORAGE_KEY = "truth_experiments_log_v1";
const LEGACY_STORAGE_KEY = "truth_experiments_grid_v1";
const LEGACY_V2_STORAGE_KEY = "truth_experiments_grid_v2";
const LEGACY_V3_STORAGE_KEY = "truth_experiments_grid_v3";
const LEGACY_V4_STORAGE_KEY = "truth_experiments_grid_v4";
const LEGACY_V5_STORAGE_KEY = "truth_experiments_grid_v5";
const LEGACY_V6_STORAGE_KEY = "truth_experiments_grid_v6";
const CORE_STATE_OPTIONS: Array<{ id: CoreDomainId; label: string }> = [
  { id: "autonomy", label: "Autonomy" },
  { id: "competence", label: "Competence" },
  { id: "transcendence", label: "Relatedness" },
  { id: "health", label: "Health" },
  { id: "wealth", label: "Wealth" },
  { id: "relations", label: "Relations" },
  { id: "meaning", label: "Meaning / Direction" },
  { id: "creativity", label: "Creativity / Expression" },
  { id: "contribution", label: "Contribution" },
];
const DEFAULT_ROWS: TruthRow[] = [
  {
    impulseType: "",
    coreState: "",
    cells: ["", "", "", "", "", ""],
    mechanismIds: {},
    habitId: undefined,
    patternId: undefined,
    growthPatternId: undefined,
    stopperId: undefined,
    linkedBotherings: [],
    resultStatus: "",
  },
  {
    impulseType: "",
    coreState: "",
    cells: ["", "", "", "", "", ""],
    mechanismIds: {},
    habitId: undefined,
    patternId: undefined,
    growthPatternId: undefined,
    stopperId: undefined,
    linkedBotherings: [],
    resultStatus: "",
  },
  {
    impulseType: "",
    coreState: "",
    cells: ["", "", "", "", "", ""],
    mechanismIds: {},
    habitId: undefined,
    patternId: undefined,
    growthPatternId: undefined,
    stopperId: undefined,
    linkedBotherings: [],
    resultStatus: "",
  },
  {
    impulseType: "",
    coreState: "",
    cells: ["", "", "", "", "", ""],
    mechanismIds: {},
    habitId: undefined,
    patternId: undefined,
    growthPatternId: undefined,
    stopperId: undefined,
    linkedBotherings: [],
    resultStatus: "",
  },
];

function TruthPageContent() {
  const { habitCards, mechanismCards, patterns, mindsetCards, setMindsetCards, setResources, openGeneralPopup } = useAuth();
  const [gridRows, setGridRows] = useState<TruthRow[]>(DEFAULT_ROWS);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isImpulsePickerOpen, setIsImpulsePickerOpen] = useState(false);
  const [activeImpulseRowIndex, setActiveImpulseRowIndex] = useState<number | null>(null);
  const [isMechanismPickerOpen, setIsMechanismPickerOpen] = useState(false);
  const [activeMechanismRowIndex, setActiveMechanismRowIndex] = useState<number | null>(null);
  const [mechanismQuery, setMechanismQuery] = useState("");
  const [isPatternPickerOpen, setIsPatternPickerOpen] = useState(false);
  const [activePatternRowIndex, setActivePatternRowIndex] = useState<number | null>(null);
  const [patternPickerMode, setPatternPickerMode] = useState<"threat" | "growth">("threat");
  const [patternQuery, setPatternQuery] = useState("");
  const [newEntryText, setNewEntryText] = useState("");
  const [newEntryType, setNewEntryType] = useState<"urge" | "resistance">("urge");
  const [selectedPatternId, setSelectedPatternId] = useState("");
  const [editingStopperId, setEditingStopperId] = useState<string | null>(null);
  const [editingStopperText, setEditingStopperText] = useState("");
  const [editingStopperPatternId, setEditingStopperPatternId] = useState("");
  const [activeBotheringEdit, setActiveBotheringEdit] = useState<{ rowIndex: number; id: string } | null>(null);
  const [botheringWhyDraft, setBotheringWhyDraft] = useState("");
  const [pendingFailMove, setPendingFailMove] = useState<{
    rowIndex: number;
    bothering: { id: string; type: "mismatch" | "constraint" | "external"; text: string; why?: string };
  } | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(true);
  const [resultFilter, setResultFilter] = useState<"live" | "fail" | "pass">("live");
  const [coreStateFilter, setCoreStateFilter] = useState<CoreDomainId | "all">("all");
  const [truthLogs, setTruthLogs] = useState<any[]>([]);
  const [patternStoppers, setPatternStoppers] = useState<PatternLinkedStopper[]>([]);
  const gridRowsRef = useRef<TruthRow[]>(DEFAULT_ROWS);

  const normalizeRow = (row: TruthRow): TruthRow => {
    const paddedCells = [...row.cells];
    while (paddedCells.length < 6) paddedCells.push("");
    if (paddedCells.length > 6) paddedCells.length = 6;
    return {
      impulseType: row.impulseType || "",
      coreState: row.coreState || "",
      cells: paddedCells as TruthRow["cells"],
      mechanismIds: row.mechanismIds || {},
      habitId: row.habitId,
      patternId: row.patternId,
      growthPatternId: row.growthPatternId,
      stopperId: row.stopperId,
      linkedBotherings: row.linkedBotherings || [],
      resultStatus: row.resultStatus || "",
    };
  };

  const normalizeRows = (rows: TruthRow[]) => rows.map(normalizeRow);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TRUTH_GRID_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (row) =>
              row &&
              typeof row === "object" &&
              Array.isArray((row as TruthRow).cells) &&
              (row as TruthRow).cells.length === 6
          )
        ) {
          setGridRows(normalizeRows(parsed as TruthRow[]));
          return;
        }
      }
      const legacyV6Raw = window.localStorage.getItem(LEGACY_V6_STORAGE_KEY);
      if (legacyV6Raw) {
        const legacyParsed = JSON.parse(legacyV6Raw);
        if (
          Array.isArray(legacyParsed) &&
          legacyParsed.every(
            (row) =>
              row &&
              typeof row === "object" &&
              Array.isArray((row as TruthRow).cells) &&
              (row as TruthRow).cells.length === 6
          )
        ) {
          setGridRows(normalizeRows(legacyParsed as TruthRow[]));
          return;
        }
      }
      const legacyV5Raw = window.localStorage.getItem(LEGACY_V5_STORAGE_KEY);
      if (legacyV5Raw) {
        const legacyParsed = JSON.parse(legacyV5Raw);
        if (
          Array.isArray(legacyParsed) &&
          legacyParsed.every(
            (row) =>
              row &&
              typeof row === "object" &&
              Array.isArray((row as TruthRow).cells) &&
              (row as TruthRow).cells.length === 6
          )
        ) {
          setGridRows(normalizeRows(legacyParsed as TruthRow[]));
          return;
        }
      }
      const legacyV4Raw = window.localStorage.getItem(LEGACY_V4_STORAGE_KEY);
      if (legacyV4Raw) {
        const legacyParsed = JSON.parse(legacyV4Raw);
        if (
          Array.isArray(legacyParsed) &&
          legacyParsed.every(
            (row) =>
              row &&
              typeof row === "object" &&
              Array.isArray((row as TruthRow).cells) &&
              (row as TruthRow).cells.length === 5
          )
        ) {
          setGridRows(
            normalizeRows(
              (legacyParsed as TruthRow[]).map((row) => ({
              impulseType: row.impulseType || "",
              coreState: "",
              cells: [...row.cells, ""] as TruthRow["cells"],
              mechanismIds: row.mechanismIds || {},
              habitId: row.habitId,
              patternId: row.patternId,
        growthPatternId: row.growthPatternId,
              stopperId: row.stopperId,
              linkedBotherings: row.linkedBotherings || [],
              resultStatus: "",
            }))
          )
          );
          return;
        }
      }
      const legacyV3Raw = window.localStorage.getItem(LEGACY_V3_STORAGE_KEY);
      if (legacyV3Raw) {
        const legacyParsed = JSON.parse(legacyV3Raw);
        if (
          Array.isArray(legacyParsed) &&
          legacyParsed.every(
            (row) =>
              row &&
              typeof row === "object" &&
              Array.isArray((row as TruthRow).cells) &&
              (row as TruthRow).cells.length === 5
          )
        ) {
          setGridRows(
            (legacyParsed as TruthRow[]).map((row) => ({
              impulseType: row.impulseType || "",
              coreState: "",
              cells: [...row.cells, ""] as TruthRow["cells"],
              mechanismIds: row.mechanismIds || {},
              habitId: row.habitId,
              patternId: row.patternId,
        growthPatternId: row.growthPatternId,
              resultStatus: "",
            }))
          );
          return;
        }
      }
      const legacyV2Raw = window.localStorage.getItem(LEGACY_V2_STORAGE_KEY);
      if (legacyV2Raw) {
        const legacyParsed = JSON.parse(legacyV2Raw);
        if (
          Array.isArray(legacyParsed) &&
          legacyParsed.every(
            (row) =>
              row &&
              typeof row === "object" &&
              Array.isArray((row as TruthRow).cells) &&
              (row as TruthRow).cells.length === 5
          )
        ) {
          setGridRows(
            normalizeRows(
              (legacyParsed as TruthRow[]).map((row) => ({
                impulseType: row.impulseType || "",
                coreState: "",
                cells: [...row.cells, ""] as TruthRow["cells"],
                mechanismIds: {},
                habitId: row.habitId,
                patternId: row.patternId,
                growthPatternId: row.growthPatternId,
                stopperId: row.stopperId,
                linkedBotherings: row.linkedBotherings || [],
                resultStatus: "",
              }))
          )
          );
          return;
        }
      }
      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed) && legacyParsed.every((row) => Array.isArray(row) && row.length === 5)) {
          setGridRows(
            normalizeRows(
              (legacyParsed as string[][]).map((cells) => ({
                impulseType: "",
                cells: [...cells, ""] as TruthRow["cells"],
                mechanismIds: {},
                habitId: undefined,
                patternId: undefined,
                growthPatternId: undefined,
                stopperId: undefined,
                linkedBotherings: [],
                resultStatus: "",
              }))
          )
          );
        }
      }
    } catch {
      // Ignore malformed storage values.
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(TRUTH_GRID_STORAGE_KEY, JSON.stringify(gridRows));
    } catch {
      // Ignore storage write failures.
    }
  }, [gridRows, isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TRUTH_LOG_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setTruthLogs(Array.isArray(parsed) ? parsed : []);
    } catch {
      setTruthLogs([]);
    }
  }, []);

  useEffect(() => {
    gridRowsRef.current = gridRows;
  }, [gridRows]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TRUTH_PATTERN_STOPPERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPatternStoppers(parsed);
        }
      }
    } catch {
      // Ignore malformed storage.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(TRUTH_PATTERN_STOPPERS_KEY, JSON.stringify(patternStoppers));
    } catch {
      // Ignore storage write failures.
    }
  }, [patternStoppers]);

  const columnLabels = useMemo(
    () => ["Impulse", "Going Beyond", "Truth", "The Test", "Result", "Why"],
    []
  );

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    setGridRows((prev) => {
      const next = prev.map((row) => ({
        impulseType: row.impulseType,
        coreState: row.coreState,
        cells: [...row.cells] as TruthRow["cells"],
        mechanismIds: { ...row.mechanismIds },
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        linkedBotherings: [...(row.linkedBotherings || [])],
        resultStatus: row.resultStatus,
      }));
      next[rowIndex].cells[colIndex] = value;
      if (colIndex === 1) {
        next[rowIndex].mechanismIds = { ...next[rowIndex].mechanismIds, negative: undefined };
      }
      if (colIndex === 2) {
        next[rowIndex].mechanismIds = { ...next[rowIndex].mechanismIds, positive: undefined };
      }
      return next;
    });
  };

  const handleImpulseTypeChange = (rowIndex: number, value: TruthRow["impulseType"]) => {
    setGridRows((prev) => {
      const next = prev.map((row) => ({ ...row, cells: [...row.cells] as TruthRow["cells"] }));
      next[rowIndex].impulseType = value;
      return next;
    });
  };

  const handleCoreStateChange = (rowIndex: number, value: CoreDomainId | "none") => {
    setGridRows((prev) => {
      const next = prev.map((row) => ({ ...row, cells: [...row.cells] as TruthRow["cells"] }));
      next[rowIndex].coreState = value === "none" ? "" : value;
      return next;
    });
  };

  const handleResultStatusChange = (rowIndex: number, status: "pass" | "fail") => {
    setGridRows((prev) => {
      const next = prev.map((row) => ({
        impulseType: row.impulseType,
        coreState: row.coreState,
        cells: [...row.cells] as TruthRow["cells"],
        mechanismIds: { ...row.mechanismIds },
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        linkedBotherings: [...(row.linkedBotherings || [])],
        resultStatus: row.resultStatus,
      }));
      if (!next[rowIndex]) return prev;
      next[rowIndex].resultStatus = status;
      next[rowIndex].cells[4] = status;
      return next;
    });
  };

  const persistTruthLog = (entry: Record<string, any>) => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TRUTH_LOG_STORAGE_KEY);
      const existing = raw ? (JSON.parse(raw) as any[]) : [];
      const next = Array.isArray(existing) ? [...existing, entry] : [entry];
      window.localStorage.setItem(TRUTH_LOG_STORAGE_KEY, JSON.stringify(next));
      setTruthLogs(next);
    } catch {
      // Ignore storage write failures.
    }
  };

  const handleSaveWhy = (rowIndex: number) => {
    setGridRows((prev) => {
      const row = prev[rowIndex];
      if (!row || !row.cells[5]?.trim()) return prev;
      const statusRaw = (row.resultStatus || row.cells[4] || "").toString().toLowerCase();
      const isPass = statusRaw === "pass" || statusRaw === "passed";
      const entry = {
        savedAt: new Date().toISOString(),
        impulseType: row.impulseType,
        coreState: row.coreState,
        impulse: row.cells[0],
        goingBeyond: row.cells[1],
        truth: row.cells[2],
        test: row.cells[3],
        result: row.resultStatus || row.cells[4],
        why: row.cells[5],
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        mechanismIds: row.mechanismIds || {},
        linkedBotherings: row.linkedBotherings || [],
      };
      persistTruthLog(entry);

      if (isPass) {
        const updatedRow: TruthRow = {
          impulseType: row.impulseType,
          coreState: row.coreState,
          cells: [...row.cells] as TruthRow["cells"],
          mechanismIds: { ...row.mechanismIds },
          habitId: row.habitId,
          patternId: row.patternId,
        growthPatternId: row.growthPatternId,
          stopperId: row.stopperId,
          linkedBotherings: [...(row.linkedBotherings || [])],
          resultStatus: "pass",
        };
        updatedRow.cells[4] = "pass";
        const reordered = prev.filter((_, index) => index !== rowIndex);
        reordered.push(updatedRow);
        return reordered;
      }

      const next = prev.map((item, index) =>
        index === rowIndex
          ? {
              ...item,
              cells: [
                item.cells[0],
                item.cells[1],
                "",
                item.cells[3],
                "",
                "",
              ] as TruthRow["cells"],
              mechanismIds: { ...item.mechanismIds, positive: undefined },
              resultStatus: "",
            }
          : item
      );
      return next;
    });
  };

  const addRow = () =>
    setGridRows((prev) => [
      ...prev,
      {
        impulseType: "",
        coreState: "",
        cells: ["", "", "", "", "", ""],
        mechanismIds: {},
        habitId: undefined,
        patternId: undefined,
        growthPatternId: undefined,
        stopperId: undefined,
        linkedBotherings: [],
        resultStatus: "",
      },
    ]);

  const removeRow = (rowIndex: number) => {
    setGridRows((prev) => prev.filter((_, index) => index !== rowIndex));
  };

  const moveRow = (fromIndex: number, toIndex: number) => {
    setGridRows((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const clearMechanismLink = (rowIndex: number, colIndex: number) => {
    setGridRows((prev) => {
      const next = prev.map((row) => ({
        impulseType: row.impulseType,
        coreState: row.coreState,
        cells: [...row.cells] as TruthRow["cells"],
        mechanismIds: { ...row.mechanismIds },
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        linkedBotherings: [...(row.linkedBotherings || [])],
        resultStatus: row.resultStatus,
      }));
      if (!next[rowIndex]) return prev;
      if (colIndex === 1) {
        next[rowIndex].mechanismIds = { ...next[rowIndex].mechanismIds, negative: undefined };
      }
      if (colIndex === 2) {
        next[rowIndex].mechanismIds = { ...next[rowIndex].mechanismIds, positive: undefined };
      }
      return next;
    });
  };

  const openImpulsePicker = (rowIndex: number) => {
    setActiveImpulseRowIndex(rowIndex);
    setPendingFailMove(null);
    setIsImpulsePickerOpen(true);
  };

  const openMechanismPicker = (rowIndex: number) => {
    setActiveMechanismRowIndex(rowIndex);
    setIsMechanismPickerOpen(true);
  };

  const openPatternPicker = (rowIndex: number, mode: "threat" | "growth") => {
    setActivePatternRowIndex(rowIndex);
    setPatternPickerMode(mode);
    setIsPatternPickerOpen(true);
  };

  const handleSelectPattern = (patternId: string) => {
    if (activePatternRowIndex === null) return;
    setGridRows((prev) => {
      const next = prev.map((row) => ({
        impulseType: row.impulseType,
        coreState: row.coreState,
        cells: [...row.cells] as TruthRow["cells"],
        mechanismIds: { ...row.mechanismIds },
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        linkedBotherings: [...(row.linkedBotherings || [])],
        resultStatus: row.resultStatus,
      }));
      if (!next[activePatternRowIndex]) return prev;
      if (patternPickerMode === "threat") {
        next[activePatternRowIndex].patternId = patternId;
      } else {
        next[activePatternRowIndex].growthPatternId = patternId;
      }
      return next;
    });
    setIsPatternPickerOpen(false);
    setActivePatternRowIndex(null);
    setPatternQuery("");
  };

  const allLinkedResistances = useMemo(() => {
    const links: {
      habitId?: string;
      habitName?: string;
      patternId?: string;
      patternName?: string;
      stopper: Stopper | PatternLinkedStopper;
      isUrge: boolean;
      mechanismName?: string;
      source: "habit" | "pattern";
    }[] = [];
    habitCards.forEach((habit) => {
      const processStoppers = (stoppers: Stopper[] = [], isUrge: boolean) => {
        stoppers.forEach((stopper) => {
          const mechanism = mechanismCards.find(
            (m) => m.id === (isUrge ? habit.response?.resourceId : habit.newResponse?.resourceId)
          );
          links.push({
            habitId: habit.id,
            habitName: habit.name,
            stopper,
            isUrge,
            mechanismName: mechanism?.name,
            source: "habit",
          });
        });
      };
      processStoppers(habit.urges, true);
      processStoppers(habit.resistances, false);
    });

    patternStoppers.forEach((stopper) => {
      const pattern = patterns.find((p) => p.id === stopper.patternId);
      links.push({
        patternId: stopper.patternId,
        patternName: pattern?.name || "Pattern",
        stopper,
        isUrge: stopper.type === "urge",
        source: "pattern",
      });
    });
    return links;
  }, [habitCards, mechanismCards, patternStoppers, patterns]);

  const sortedResistances = useMemo(() => {
    return [...allLinkedResistances].sort((a, b) => {
      const lastA = Math.max(0, ...(a.stopper.timestamps || []));
      const lastB = Math.max(0, ...(b.stopper.timestamps || []));
      return lastB - lastA;
    });
  }, [allLinkedResistances]);

  const getResistanceHighlightClass = (stopper: { timestamps?: number[] }) => {
    const todayStart = startOfDay(new Date());
    const todayTimestamps = (stopper.timestamps || []).filter((ts) => ts >= todayStart.getTime());
    const count = todayTimestamps.length;
    const sevenDaysAgo = subDays(todayStart, 7);
    const lastTimestamp = Math.max(0, ...(stopper.timestamps || []));
    const isDormant = lastTimestamp > 0 && isBefore(new Date(lastTimestamp), sevenDaysAgo);

    let highlightClass = "bg-muted/50";
    if (count === 1) highlightClass = "bg-yellow-500/20";
    else if (count === 2) highlightClass = "bg-orange-500/20";
    else if (count >= 3) highlightClass = "bg-red-500/20";
    else if (count === 0 && !isDormant) highlightClass = "bg-green-500/10";

    return { className: highlightClass, dormant: isDormant };
  };

  const handleAddEntry = () => {
    if (!newEntryText.trim()) return;
    if (!selectedPatternId) return;

    const newStopper: PatternLinkedStopper = {
      id: `stopper_${Date.now()}`,
      text: newEntryText.trim(),
      type: newEntryType,
      patternId: selectedPatternId,
      timestamps: [],
    };

    setPatternStoppers((prev) => [...prev, newStopper]);

    setNewEntryText("");
    setSelectedPatternId("");
  };

  const handleStartEditStopper = (stopper: { id: string; text: string; patternId?: string }) => {
    setEditingStopperId(stopper.id);
    setEditingStopperText(stopper.text);
    setEditingStopperPatternId(stopper.patternId || "");
  };

  const handleCancelEditStopper = () => {
    setEditingStopperId(null);
    setEditingStopperText("");
    setEditingStopperPatternId("");
  };

  const handleSaveStopper = (habitId: string, stopperId: string, isUrge: boolean) => {
    const nextText = editingStopperText.trim();
    if (!nextText) {
      handleCancelEditStopper();
      return;
    }
    setResources((prev) =>
      prev.map((resource) => {
        if (resource.id !== habitId) return resource;
        const updated = { ...resource };
        if (isUrge) {
          updated.urges = (updated.urges || []).map((stopper) =>
            stopper.id === stopperId ? { ...stopper, text: nextText } : stopper
          );
        } else {
          updated.resistances = (updated.resistances || []).map((stopper) =>
            stopper.id === stopperId ? { ...stopper, text: nextText } : stopper
          );
        }
        return updated;
      })
    );
    handleCancelEditStopper();
  };

  const handleDeleteStopper = (habitId: string, stopperId: string, isUrge: boolean) => {
    if (!window.confirm("Delete this entry?")) return;
    setResources((prev) =>
      prev.map((resource) => {
        if (resource.id !== habitId) return resource;
        const updated = { ...resource };
        if (isUrge) {
          updated.urges = (updated.urges || []).filter((stopper) => stopper.id !== stopperId);
        } else {
          updated.resistances = (updated.resistances || []).filter((stopper) => stopper.id !== stopperId);
        }
        return updated;
      })
    );
    if (editingStopperId === stopperId) {
      handleCancelEditStopper();
    }
  };

  const handleSavePatternStopper = (stopperId: string) => {
    const nextText = editingStopperText.trim();
    if (!nextText) {
      handleCancelEditStopper();
      return;
    }
    setPatternStoppers((prev) =>
      prev.map((stopper) =>
        stopper.id === stopperId
          ? {
              ...stopper,
              text: nextText,
              patternId: editingStopperPatternId || stopper.patternId,
            }
          : stopper
      )
    );
    handleCancelEditStopper();
  };

  const handleBotheringDecision = (
    rowIndex: number,
    botheringId: string,
    botheringType: "mismatch" | "constraint" | "external",
    botheringText: string,
    status: "pass" | "fail",
    why: string
  ) => {
    if (status === "fail") {
      setPendingFailMove({
        rowIndex,
        bothering: {
          id: botheringId,
          type: botheringType,
          text: botheringText,
          why,
        },
      });
      setIsImpulsePickerOpen(true);
      setActiveImpulseRowIndex(null);
      setActiveBotheringEdit(null);
      setBotheringWhyDraft("");
      return;
    }

    setGridRows((prev) => {
      const next = prev.map((row) => ({
        impulseType: row.impulseType,
        coreState: row.coreState,
        cells: [...row.cells] as TruthRow["cells"],
        mechanismIds: { ...row.mechanismIds },
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        linkedBotherings: [...(row.linkedBotherings || [])],
        resultStatus: row.resultStatus,
      }));
      const row = next[rowIndex];
      if (!row) return prev;
      const botherIndex = (row.linkedBotherings || []).findIndex((b) => b.id === botheringId);
      if (botherIndex === -1) return prev;
      const bothering = row.linkedBotherings![botherIndex];
      row.linkedBotherings![botherIndex] = { ...bothering, status, why };
      return next;
    });
    setActiveBotheringEdit(null);
    setBotheringWhyDraft("");
  };

  const handleDeletePatternStopper = (stopperId: string) => {
    if (!window.confirm("Delete this entry?")) return;
    setPatternStoppers((prev) => prev.filter((stopper) => stopper.id !== stopperId));
    if (editingStopperId === stopperId) {
      handleCancelEditStopper();
    }
  };

  const habitById = useMemo(() => new Map(habitCards.map((habit) => [habit.id, habit])), [habitCards]);
  const mechanismById = useMemo(
    () => new Map(mechanismCards.map((mechanism) => [mechanism.id, mechanism])),
    [mechanismCards]
  );
  const mechanismByName = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    mechanismCards.forEach((mechanism) => {
      const key = mechanism.name?.trim().toLowerCase();
      if (key) map.set(key, { id: mechanism.id, name: mechanism.name });
    });
    return map;
  }, [mechanismCards]);
  const THREAT_TO_GROWTH_PATTERN: Record<string, string> = {
    Resistance: "Initiative",
    Avoidance: "Mastery",
    "Emotional Distress": "Connection",
  };

  const normalizeText = (value?: string) => value?.trim().toLowerCase() || "";

  const getPatternForHabitId = (habitId?: string) => {
    if (!habitId) return null;
    const habit = habitById.get(habitId);
    const responseMechanismId = habit?.response?.resourceId;
    const newResponseMechanismId = habit?.newResponse?.resourceId;
    const habitName = normalizeText(habit?.name);
    const responseMechanismName = responseMechanismId
      ? normalizeText(mechanismById.get(responseMechanismId)?.name)
      : "";
    const newResponseMechanismName = newResponseMechanismId
      ? normalizeText(mechanismById.get(newResponseMechanismId)?.name)
      : "";
    const nameTokens = [habitName, responseMechanismName, newResponseMechanismName].filter(Boolean);
    return (
      patterns.find((pattern) =>
        pattern.phrases.some((phrase) => {
          if (phrase.category === "Habit Cards" && phrase.mechanismCardId === habitId) return true;
          if (
            phrase.category === "Habit Cards" &&
            habitName &&
            phrase.mechanismCardName?.trim().toLowerCase() === habitName
          )
            return true;
          if (phrase.mechanismCardId && phrase.mechanismCardId === responseMechanismId) return true;
          if (phrase.mechanismCardId && phrase.mechanismCardId === newResponseMechanismId) return true;
          if (responseMechanismId && phrase.linkedMechanisms?.includes(responseMechanismId)) return true;
          if (newResponseMechanismId && phrase.linkedMechanisms?.includes(newResponseMechanismId)) return true;
          return false;
        })
      ) ||
      patterns.find((pattern) => {
        const haystack = [
          pattern.name,
          pattern.threatSignal,
          pattern.threatAction,
          pattern.threatOutcome,
          pattern.growthSignal,
          pattern.growthAction,
          pattern.growthOutcome,
          pattern.sharedCause,
          pattern.state,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return nameTokens.some((token) => token && haystack.includes(token));
      }) ||
      null
    );
  };

  const matchesHabitToPattern = (pattern: (typeof patterns)[number], habitId: string) => {
    const habit = habitById.get(habitId);
    const habitName = normalizeText(habit?.name);
    const responseMechanismId = habit?.response?.resourceId;
    const newResponseMechanismId = habit?.newResponse?.resourceId;
    const responseMechanismName = responseMechanismId
      ? normalizeText(mechanismById.get(responseMechanismId)?.name)
      : "";
    const newResponseMechanismName = newResponseMechanismId
      ? normalizeText(mechanismById.get(newResponseMechanismId)?.name)
      : "";
    const phraseMatch = pattern.phrases.some((phrase) => {
      if (phrase.category === "Habit Cards" && phrase.mechanismCardId === habitId) return true;
      if (phrase.category === "Habit Cards" && habitName && normalizeText(phrase.mechanismCardName) === habitName) return true;
      if (phrase.mechanismCardId && phrase.mechanismCardId === responseMechanismId) return true;
      if (phrase.mechanismCardId && phrase.mechanismCardId === newResponseMechanismId) return true;
      if (responseMechanismId && phrase.linkedMechanisms?.includes(responseMechanismId)) return true;
      if (newResponseMechanismId && phrase.linkedMechanisms?.includes(newResponseMechanismId)) return true;
      return false;
    });
    if (phraseMatch) return true;
    const haystack = [
      pattern.name,
      pattern.threatSignal,
      pattern.threatAction,
      pattern.threatOutcome,
      pattern.growthSignal,
      pattern.growthAction,
      pattern.growthOutcome,
      pattern.sharedCause,
      pattern.state,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return [habitName, responseMechanismName, newResponseMechanismName].some((token) => token && haystack.includes(token));
  };

  const getThreatPatternForHabit = (habitId?: string) => {
    if (!habitId) return null;
    const negativePatterns = patterns.filter((pattern) => pattern.type === "Negative");
    return negativePatterns.find((pattern) => matchesHabitToPattern(pattern, habitId)) || null;
  };

  const getGrowthPatternForThreat = (threatPattern: (typeof patterns)[number] | null) => {
    if (!threatPattern) return null;
    const targetCategory = threatPattern.patternCategory
      ? THREAT_TO_GROWTH_PATTERN[threatPattern.patternCategory] || ""
      : "";
    const candidates = patterns.filter((pattern) => pattern.type === "Positive");
    const filtered = targetCategory
      ? candidates.filter((pattern) => normalizeText(pattern.patternCategory) === normalizeText(targetCategory))
      : candidates;
    const sharedCause = normalizeText(threatPattern.sharedCause);
    const state = normalizeText(threatPattern.state);
    return (
      filtered.find((pattern) => normalizeText(pattern.sharedCause) === sharedCause && sharedCause) ||
      filtered.find((pattern) => normalizeText(pattern.state) === state && state) ||
      filtered[0] ||
      null
    );
  };

  const normalizeActionText = (value?: string) => {
    if (!value) return "";
    let text = value.trim();
    if (!text) return "";
    const lower = text.toLowerCase();
    if (lower.startsWith("when i ")) {
      text = text.slice(7).trim();
    }
    const causeIndex = text.toLowerCase().indexOf("it causes");
    if (causeIndex >= 0) {
      text = text.slice(0, causeIndex).trim();
    }
    const commaIndex = text.indexOf(",");
    if (commaIndex >= 0) {
      text = text.slice(0, commaIndex).trim();
    }
    text = text.replace(/[.]+$/, "").trim();
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const findMechanismByActionText = (actionText?: string) => {
    const normalizedCore = normalizeActionText(actionText);
    if (!normalizedCore) return undefined;
    for (const mechanism of mechanismCards) {
      const candidate = normalizeActionText(mechanism.trigger?.action);
      if (!candidate) continue;
      if (candidate === normalizedCore) return mechanism.id;
      if (candidate.includes(normalizedCore) || normalizedCore.includes(candidate)) {
        return mechanism.id;
      }
    }
    return undefined;
  };

  const buildPatternPathText = (pattern: (typeof patterns)[number] | null | undefined, mode: "threat" | "growth") => {
    if (!pattern) return "";
    if (mode === "threat") {
      return [
        pattern.threatSignal,
        pattern.threatAction,
        pattern.actionType,
        pattern.threatOutcome,
      ]
        .filter(Boolean)
        .join(" -> ");
    }
    return [
      pattern.growthSignal,
      pattern.growthAction,
      pattern.growthActionType,
      pattern.growthOutcome,
    ]
      .filter(Boolean)
      .join(" -> ");
  };


  const handleSelectImpulse = (payload: { text: string; type: "Urge" | "Resistance"; habitId: string; stopperId: string }) => {
    if (activeImpulseRowIndex === null && !pendingFailMove) return;
    const habit = habitById.get(payload.habitId);
    const negativeMechanismId = habit?.response?.resourceId;
    const positiveMechanismId = habit?.newResponse?.resourceId;
    const negativeMechanism = negativeMechanismId ? mechanismById.get(negativeMechanismId)?.name : "";
    const positiveMechanism = positiveMechanismId ? mechanismById.get(positiveMechanismId)?.name : "";
    const threatPattern = getThreatPatternForHabit(payload.habitId);
    const growthPattern = getGrowthPatternForThreat(threatPattern);
    const growthSource = growthPattern || threatPattern;
    const threatPatternText = buildPatternPathText(threatPattern, "threat") || threatPattern?.name || "";
    const growthPatternText = buildPatternPathText(growthSource, "growth") || growthSource?.name || "";
    const resolveMechanismFromAction = (action?: string) => {
      if (!action) return undefined;
      const normalized = action.trim().toLowerCase();
      if (!normalized) return undefined;
      const direct = mechanismByName.get(normalized);
      if (direct) return direct;
      for (const [name, value] of mechanismByName.entries()) {
        if (normalized.includes(name) || name.includes(normalized)) {
          return value;
        }
      }
      return undefined;
    };
    const threatActionMechanism = resolveMechanismFromAction(threatPattern?.threatAction);
    const growthActionMechanism = resolveMechanismFromAction(growthSource?.growthAction);
    const applyImpulseToRow = (row: TruthRow): TruthRow => {
      const nextRow: TruthRow = {
        impulseType: row.impulseType,
        coreState: row.coreState,
        cells: [...row.cells] as TruthRow["cells"],
        mechanismIds: { ...row.mechanismIds },
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        linkedBotherings: [...(row.linkedBotherings || [])],
        resultStatus: row.resultStatus,
      };
      nextRow.cells[0] = payload.text;
      nextRow.impulseType = payload.type;
      nextRow.patternId = threatPattern?.id;
      nextRow.growthPatternId = undefined;
      if (threatPattern || growthSource) {
        const negativeMechanismName = threatActionMechanism?.name || threatPattern?.threatAction || "";
        const positiveMechanismName = growthActionMechanism?.name || growthSource?.growthAction || "";
        nextRow.cells[1] = negativeMechanismName;
        nextRow.cells[2] = positiveMechanismName;
        nextRow.mechanismIds = {
          ...nextRow.mechanismIds,
          negative: threatActionMechanism?.id,
          positive: growthActionMechanism?.id,
        };
      } else {
        nextRow.cells[1] = negativeMechanism || "";
        nextRow.cells[2] = positiveMechanism || "";
        nextRow.mechanismIds = {
          negative: negativeMechanismId || undefined,
          positive: positiveMechanismId || undefined,
        };
      }
      nextRow.habitId = payload.habitId;
      nextRow.stopperId = payload.stopperId;
      return nextRow;
    };

    setGridRows((prev) => {
      const next = prev.map((row) => ({
        impulseType: row.impulseType,
        coreState: row.coreState,
        cells: [...row.cells] as TruthRow["cells"],
        mechanismIds: { ...row.mechanismIds },
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        linkedBotherings: [...(row.linkedBotherings || [])],
        resultStatus: row.resultStatus,
      }));

      if (pendingFailMove) {
        const sourceRow = next[pendingFailMove.rowIndex];
        if (!sourceRow) return prev;
        sourceRow.linkedBotherings = (sourceRow.linkedBotherings || []).filter(
          (b) => b.id !== pendingFailMove.bothering.id
        );
        const newRowBase: TruthRow = {
          impulseType: "",
          coreState: "",
          cells: ["", "", "", "", "", ""],
          mechanismIds: {},
          habitId: undefined,
          patternId: undefined,
          growthPatternId: undefined,
          stopperId: undefined,
          linkedBotherings: [
            {
              id: pendingFailMove.bothering.id,
              type: pendingFailMove.bothering.type,
              status: undefined,
              why: pendingFailMove.bothering.why,
            },
          ],
          resultStatus: "",
        };
        const newRow = applyImpulseToRow(newRowBase);
        next.splice(pendingFailMove.rowIndex + 1, 0, newRow);
        return next;
      }

      if (activeImpulseRowIndex === null || !next[activeImpulseRowIndex]) return prev;
      const updatedRow = applyImpulseToRow(next[activeImpulseRowIndex]);
      updatedRow.linkedBotherings = [];
      next[activeImpulseRowIndex] = updatedRow;
      return next;
    });
    setIsImpulsePickerOpen(false);
    setActiveImpulseRowIndex(null);
    setPendingFailMove(null);
  };

  const handleSelectPatternStopper = (link: (typeof sortedResistances)[number]) => {
    if (link.source !== "pattern") return;
    if (pendingFailMove) {
      setGridRows((prev) => {
        const next = prev.map((row) => ({
          impulseType: row.impulseType,
          coreState: row.coreState,
          cells: [...row.cells] as TruthRow["cells"],
          mechanismIds: { ...row.mechanismIds },
          habitId: row.habitId,
          patternId: row.patternId,
          growthPatternId: row.growthPatternId,
          stopperId: row.stopperId,
          linkedBotherings: [...(row.linkedBotherings || [])],
          resultStatus: row.resultStatus,
        }));
        const sourceRow = next[pendingFailMove.rowIndex];
        if (!sourceRow) return prev;
        sourceRow.linkedBotherings = (sourceRow.linkedBotherings || []).filter(
          (b) => b.id !== pendingFailMove.bothering.id
        );
        const newRow: TruthRow = {
          impulseType: link.isUrge ? "Urge" : "Resistance",
          coreState: "",
          cells: [link.stopper.text, "", "", "", "", ""],
          mechanismIds: { negative: undefined, positive: undefined },
          habitId: undefined,
          patternId: link.patternId,
          growthPatternId: undefined,
          stopperId: link.stopper.id,
          linkedBotherings: [
            {
              id: pendingFailMove.bothering.id,
              type: pendingFailMove.bothering.type,
              status: undefined,
              why: pendingFailMove.bothering.why,
            },
          ],
          resultStatus: "",
        };
        next.splice(pendingFailMove.rowIndex + 1, 0, newRow);
        return next;
      });
      setIsImpulsePickerOpen(false);
      setActiveImpulseRowIndex(null);
      setPendingFailMove(null);
      return;
    }

    if (activeImpulseRowIndex === null) return;
    setGridRows((prev) => {
      const next = prev.map((row) => ({
        impulseType: row.impulseType,
        coreState: row.coreState,
        cells: [...row.cells] as TruthRow["cells"],
        mechanismIds: { ...row.mechanismIds },
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        linkedBotherings: [...(row.linkedBotherings || [])],
        resultStatus: row.resultStatus,
      }));
      if (!next[activeImpulseRowIndex]) return prev;
      next[activeImpulseRowIndex].cells[0] = link.stopper.text;
      next[activeImpulseRowIndex].impulseType = link.isUrge ? "Urge" : "Resistance";
      next[activeImpulseRowIndex].cells[1] = "";
      next[activeImpulseRowIndex].cells[2] = "";
      next[activeImpulseRowIndex].mechanismIds = {
        ...next[activeImpulseRowIndex].mechanismIds,
        negative: undefined,
        positive: undefined,
      };
      next[activeImpulseRowIndex].habitId = undefined;
      next[activeImpulseRowIndex].patternId = link.patternId;
      next[activeImpulseRowIndex].growthPatternId = undefined;
      next[activeImpulseRowIndex].stopperId = link.stopper.id;
      next[activeImpulseRowIndex].linkedBotherings = [];
      return next;
    });
    setIsImpulsePickerOpen(false);
    setActiveImpulseRowIndex(null);
  };

  const filteredMechanisms = useMemo(() => {
    const query = mechanismQuery.trim().toLowerCase();
    if (!query) return mechanismCards;
    return mechanismCards.filter((mech) => mech.name.toLowerCase().includes(query));
  }, [mechanismCards, mechanismQuery]);

  const threatPatterns = useMemo(
    () => patterns.filter((pattern) => pattern.type === "Negative"),
    [patterns]
  );
  const growthPatterns = useMemo(
    () => patterns.filter((pattern) => pattern.type === "Positive"),
    [patterns]
  );
  const filteredPatterns = useMemo(() => {
    const query = patternQuery.trim().toLowerCase();
    const base = patternPickerMode === "threat" ? threatPatterns : growthPatterns;
    if (!query) return base;
    return base.filter((pattern) => {
      const haystack = [
        pattern.name,
        pattern.threatSignal,
        pattern.threatAction,
        pattern.threatOutcome,
        pattern.growthSignal,
        pattern.growthAction,
        pattern.growthOutcome,
        pattern.sharedCause,
        pattern.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [patternPickerMode, patternQuery, threatPatterns, growthPatterns]);

  const handleSelectMechanism = (mechanismId: string) => {
    if (activeMechanismRowIndex === null) return;
    const mechanismName = mechanismById.get(mechanismId)?.name;
    if (!mechanismName) return;
    setGridRows((prev) => {
      const next = prev.map((row) => ({
        impulseType: row.impulseType,
        cells: [...row.cells] as TruthRow["cells"],
        mechanismIds: { ...row.mechanismIds },
        habitId: row.habitId,
        patternId: row.patternId,
        growthPatternId: row.growthPatternId,
        stopperId: row.stopperId,
        linkedBotherings: [...(row.linkedBotherings || [])],
        resultStatus: row.resultStatus,
      }));
      if (!next[activeMechanismRowIndex]) return prev;
      next[activeMechanismRowIndex].cells[2] = mechanismName;
      next[activeMechanismRowIndex].mechanismIds = {
        ...next[activeMechanismRowIndex].mechanismIds,
        positive: mechanismId,
      };
      return next;
    });
    setIsMechanismPickerOpen(false);
    setActiveMechanismRowIndex(null);
    setMechanismQuery("");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { targetResourceId?: string; botheringId?: string; botheringType?: "mismatch" | "constraint" | "external" }
        | undefined;
      if (!detail?.targetResourceId || !detail.botheringId || !detail.botheringType) return;
      const match = detail.targetResourceId.match(/^truth-row-(\d+)$/);
      if (!match) return;
      const rowIndex = Number(match[1]);
      if (Number.isNaN(rowIndex)) return;
      const row = gridRowsRef.current[rowIndex];
      if (!row) return;
      setGridRows((prev) => {
        const next = prev.map((item, index) => {
          if (index !== rowIndex) return item;
          const existing = item.linkedBotherings || [];
          const map = new Map(existing.map((entry) => [entry.id, entry]));
          if (!map.has(detail.botheringId!)) {
            map.set(detail.botheringId!, { id: detail.botheringId!, type: detail.botheringType! });
          }
          return { ...item, linkedBotherings: Array.from(map.values()) };
        });
        return next;
      });
      const resolveStopperId = () => {
        if (row.stopperId) return row.stopperId;
        const habit = row.habitId ? habitById.get(row.habitId) : undefined;
        const searchHabits = habit ? [habit] : habitCards;
        const targetText = row.cells[0]?.trim().toLowerCase();
        if (!targetText) return undefined;
        for (const h of searchHabits) {
          const urgeMatch = (h.urges || []).find((s) => s.text?.trim().toLowerCase() === targetText);
          if (urgeMatch) return urgeMatch.id;
          const resistanceMatch = (h.resistances || []).find((s) => s.text?.trim().toLowerCase() === targetText);
          if (resistanceMatch) return resistanceMatch.id;
        }
        return undefined;
      };
      const stopperId = resolveStopperId();
      if (!stopperId) return;
      const isUrge = row.impulseType === "Urge";
      setMindsetCards((cards) =>
        cards.map((card) => {
          if (card.id !== `mindset_botherings_${detail.botheringType}`) return card;
          const nextPoints = (card.points || []).map((point) => {
            if (point.id !== detail.botheringId) return point;
            if (isUrge) {
              const nextIds = Array.from(new Set([...(point.linkedUrgeIds || []), stopperId]));
              return { ...point, linkedUrgeIds: nextIds };
            }
            const nextIds = Array.from(new Set([...(point.linkedResistanceIds || []), stopperId]));
            return { ...point, linkedResistanceIds: nextIds };
          });
          return { ...card, points: nextPoints };
        })
      );
    };
    window.addEventListener("bothering-selected", handler as EventListener);
    return () => window.removeEventListener("bothering-selected", handler as EventListener);
  }, [setMindsetCards, habitCards, habitById]);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border bg-background/70 p-6 shadow-sm sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(14,116,144,0.12),transparent_55%)]" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-white/70 shadow-sm">
              <Eye className="h-6 w-6 text-sky-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Page</p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Truth</h1>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Truth is the quiet standard that keeps everything else honest. This page is a living contract for how we
            test beliefs, surface contradictions, and align action with reality.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Clarity", "Precision", "Integrity", "Evidence"].map((label) => (
              <Badge key={label} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        <Card className="border-muted/60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Compass className="h-5 w-5 text-emerald-600" />
              <div>
                <CardTitle className="text-xl">Experiments with Truth</CardTitle>
                <CardDescription>Experiments for staying aligned with reality.</CardDescription>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Tabs value={resultFilter} onValueChange={(value) => setResultFilter(value as "live" | "fail" | "pass")} className="w-full max-w-xs">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="live">Live</TabsTrigger>
                  <TabsTrigger value="fail">Failed</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={coreStateFilter} onValueChange={(value) => setCoreStateFilter(value as CoreDomainId | "all")}>
                <SelectTrigger className="h-8 w-[190px]">
                  <div className="flex items-center gap-2 text-xs">
                    <Filter className="h-3.5 w-3.5" />
                    <SelectValue placeholder="Core state" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All core states</SelectItem>
                  {CORE_STATE_OPTIONS.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
            <div className="overflow-hidden rounded-2xl border bg-muted/20">
              <div className="grid grid-cols-6 gap-px bg-border text-xs font-semibold text-muted-foreground">
                {columnLabels.map((label) => (
                  <div key={label} className="bg-background/70 px-3 py-2">
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-px bg-border text-sm text-foreground">
                {(() => {
                  if (resultFilter === "live") {
                    return gridRows.map((row, rowIndex) => {
                      if (coreStateFilter !== "all" && row.coreState !== coreStateFilter) return null;
                      return (
                        <React.Fragment key={`row-${rowIndex}`}>
                        {columnLabels.map((_, colIndex) => {
                          const statusRaw = (row.resultStatus || row.cells[4] || "").toString().toLowerCase();
                          const isPassRow = statusRaw === "pass" || statusRaw === "passed";
                          const cell = row.cells[colIndex] ?? "";
                          return (
                          <div
                            key={`cell-${rowIndex}-${colIndex}`}
                            className={cn(
                              "bg-background/70 p-2 relative",
                              isPassRow && "bg-emerald-500/10"
                            )}
                          >
                        {colIndex === 0 && (
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1.5">
                              <Select
                                value={row.impulseType}
                                onValueChange={(value) => handleImpulseTypeChange(rowIndex, value as TruthRow["impulseType"])}
                              >
                                <SelectTrigger className="h-7 border-0 bg-transparent px-0 text-[11px] text-muted-foreground shadow-none focus:ring-0 focus:ring-offset-0">
                                  <SelectValue placeholder="Link: Urge / Resistance / Bothering" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Urge">Urge</SelectItem>
                                  <SelectItem value="Resistance">Resistance</SelectItem>
                                  <SelectItem value="Bothering">Bothering</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={row.coreState || "none"}
                                onValueChange={(value) => handleCoreStateChange(rowIndex, value as CoreDomainId | "none")}
                              >
                                <SelectTrigger className="h-7 border-0 bg-transparent px-0 text-[11px] text-muted-foreground shadow-none focus:ring-0 focus:ring-offset-0">
                                  <SelectValue placeholder="Core state" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No core state</SelectItem>
                                  {CORE_STATE_OPTIONS.map((state) => (
                                    <SelectItem key={state.id} value={state.id}>
                                      {state.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveRow(rowIndex, rowIndex - 1)}
                                disabled={rowIndex === 0}
                                aria-label="Move row up"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveRow(rowIndex, rowIndex + 1)}
                                disabled={rowIndex === gridRows.length - 1}
                                aria-label="Move row down"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {colIndex === 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute bottom-2 right-2 h-6 w-6 rounded-full"
                            onClick={() => openPatternPicker(rowIndex, "threat")}
                            aria-label="Pick a threat pattern"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                        {colIndex === 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute bottom-2 right-2 h-6 w-6 rounded-full"
                            onClick={() => openPatternPicker(rowIndex, "growth")}
                            aria-label="Pick a growth pattern"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                        {(() => {
                          const mechanismId =
                            colIndex === 1
                              ? row.mechanismIds?.negative
                              : colIndex === 2
                                ? row.mechanismIds?.positive
                                : undefined;
                          const mechanismName = mechanismId ? mechanismById.get(mechanismId)?.name : undefined;
                          const patternFromId = row.patternId
                            ? patterns.find((pattern) => pattern.id === row.patternId)
                            : null;
                          const threatPatternObj =
                            patternFromId || (row.habitId ? getThreatPatternForHabit(row.habitId) : null);
                          const growthPatternFromId = row.growthPatternId
                            ? patterns.find((pattern) => pattern.id === row.growthPatternId)
                            : null;
                          const growthPatternObj =
                            growthPatternFromId || getGrowthPatternForThreat(threatPatternObj) || threatPatternObj;
                          const threatPattern =
                            buildPatternPathText(threatPatternObj, "threat") || threatPatternObj?.name;
                          const growthPatternText =
                            buildPatternPathText(growthPatternObj, "growth") || growthPatternObj?.name;
                          const linkedBotherings =
                            colIndex === 3
                              ? (row.linkedBotherings || [])
                                  .map((entry) => {
                                    const card = mindsetCards.find(
                                      (c) => c.id === `mindset_botherings_${entry.type}`
                                    );
                                    const point = card?.points?.find((p) => p.id === entry.id);
                                    return point
                                      ? { id: entry.id, text: point.text, type: entry.type, status: entry.status, why: entry.why }
                                      : null;
                                  })
                                  .filter(Boolean) as Array<{ id: string; text: string; type: "external" | "mismatch" | "constraint"; status?: "pass" | "fail"; why?: string }>
                              : [];
                          const linkedBotheringsByType = {
                            mismatch: linkedBotherings.filter((b) => b.type === "mismatch"),
                            constraint: linkedBotherings.filter((b) => b.type === "constraint"),
                            external: linkedBotherings.filter((b) => b.type === "external"),
                          };
                          if (colIndex === 4) {
                            return (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={row.resultStatus === "pass" ? "default" : "outline"}
                                  className="h-7 px-3 text-xs"
                                  onClick={() => handleResultStatusChange(rowIndex, "pass")}
                                >
                                  Pass
                                </Button>
                                <Button
                                  size="sm"
                                  variant={row.resultStatus === "fail" ? "default" : "outline"}
                                  className="h-7 px-3 text-xs"
                                  onClick={() => handleResultStatusChange(rowIndex, "fail")}
                                >
                                  Fail
                                </Button>
                              </div>
                            );
                          }
                          if ((colIndex === 1 || colIndex === 2) && mechanismId && mechanismName) {
                            const patternLabel = colIndex === 1 ? "Threat Pattern" : "Growth Pattern";
                            const patternSignal = colIndex === 1 ? threatPatternObj?.threatSignal : growthPatternObj?.growthSignal;
                            const patternAction = colIndex === 1 ? threatPatternObj?.threatAction : growthPatternObj?.growthAction;
                            const patternActionType = colIndex === 1 ? threatPatternObj?.actionType : growthPatternObj?.growthActionType;
                            const patternOutcome = colIndex === 1 ? threatPatternObj?.threatOutcome : growthPatternObj?.growthOutcome;
                            const actionMechanismId =
                              colIndex === 1
                                ? row.mechanismIds?.negative || findMechanismByActionText(patternAction)
                                : row.mechanismIds?.positive || findMechanismByActionText(patternAction);
                            return (
                              <div className="flex items-start justify-between gap-2 text-xs">
                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    className="text-left font-semibold text-foreground hover:underline"
                                    onClick={() => openGeneralPopup?.(mechanismId, null)}
                                  >
                                    {cell || mechanismName}
                                  </button>
                                  {(patternSignal || patternAction || patternOutcome) && (
                                    <div className="text-[11px] text-muted-foreground">
                                      {patternLabel}:{" "}
                                      {patternSignal && <span>{patternSignal}</span>}
                                      {patternSignal && patternAction && <span> {"->"} </span>}
                                      {patternAction ? (
                                        actionMechanismId ? (
                                          <button
                                            type="button"
                                            className="text-foreground/90 underline-offset-2 hover:underline"
                                            onClick={() => openGeneralPopup?.(actionMechanismId, null)}
                                          >
                                            {patternAction}
                                          </button>
                                        ) : (
                                          <span>{patternAction}</span>
                                        )
                                      ) : null}
                                      {(patternSignal || patternAction) && patternActionType && <span> {"->"} </span>}
                                      {patternActionType && <span>{patternActionType}</span>}
                                      {(patternSignal || patternAction || patternActionType) && patternOutcome && <span> {"->"} </span>}
                                      {patternOutcome && <span>{patternOutcome}</span>}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => clearMechanismLink(rowIndex, colIndex)}
                                  aria-label="Unlink mechanism"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            );
                          }
                          if (colIndex === 1 || colIndex === 2) {
                            const patternText = colIndex === 1 ? threatPattern : growthPatternText;
                            const patternLabel = colIndex === 1 ? "Threat Pattern" : "Growth Pattern";
                            const patternSignal = colIndex === 1 ? threatPatternObj?.threatSignal : growthPatternObj?.growthSignal;
                            const patternAction = colIndex === 1 ? threatPatternObj?.threatAction : growthPatternObj?.growthAction;
                            const patternActionType = colIndex === 1 ? threatPatternObj?.actionType : growthPatternObj?.growthActionType;
                            const patternOutcome = colIndex === 1 ? threatPatternObj?.threatOutcome : growthPatternObj?.growthOutcome;
                            const actionMechanismId =
                              colIndex === 1
                                ? row.mechanismIds?.negative || findMechanismByActionText(patternAction)
                                : row.mechanismIds?.positive || findMechanismByActionText(patternAction);
                            if (patternText || patternSignal || patternAction || patternOutcome) {
                              return (
                                <div className="space-y-1 text-xs">
                                  <div className="text-[11px] text-muted-foreground">
                                    {patternLabel}:{" "}
                                    {patternSignal && (
                                      <span>{patternSignal}</span>
                                    )}
                                    {patternSignal && patternAction && <span> {"->"} </span>}
                                    {patternAction ? (
                                      actionMechanismId ? (
                                        <button
                                          type="button"
                                          className="text-foreground/90 underline-offset-2 hover:underline"
                                          onClick={() => openGeneralPopup?.(actionMechanismId, null)}
                                        >
                                          {patternAction}
                                        </button>
                                      ) : (
                                        <span>{patternAction}</span>
                                      )
                                    ) : null}
                                    {(patternSignal || patternAction) && patternActionType && <span> {"->"} </span>}
                                    {patternActionType && <span>{patternActionType}</span>}
                                    {(patternSignal || patternAction || patternActionType) && patternOutcome && <span> {"->"} </span>}
                                    {patternOutcome && <span>{patternOutcome}</span>}
                                    {!patternSignal && !patternAction && !patternOutcome && patternText ? (
                                      <span>{patternText}</span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            }
                          }
                          if (colIndex === 3) {
                            const hasAny = linkedBotherings.length > 0;
                            const makeSection = (label: "Mismatch" | "Constraint" | "External", type: "mismatch" | "constraint" | "external") => {
                              const items = linkedBotheringsByType[type];
                              if (items.length === 0) return null;
                              return (
                                <div key={type} className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                                    <span>{label}</span>
                                  </div>
                                  {items.length > 0 ? (
                                    <ul className="space-y-2 text-[11px] text-muted-foreground">
                                      {items.map((b) => {
                                        const isEditing =
                                          activeBotheringEdit?.rowIndex === rowIndex && activeBotheringEdit.id === b.id;
                                        return (
                                          <li key={b.id} className="whitespace-normal">
                                            <button
                                              type="button"
                                              className={cn(
                                                "text-left hover:underline",
                                                b.status === "pass" && "text-emerald-400"
                                              )}
                                              onClick={() => {
                                                setActiveBotheringEdit({ rowIndex, id: b.id });
                                                setBotheringWhyDraft(b.why || "");
                                              }}
                                            >
                                              {b.text}
                                            </button>
                                            {isEditing && (
                                              <div className="mt-2 space-y-2">
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    size="sm"
                                                    className="h-6 px-2 text-[11px]"
                                                    onClick={() =>
                                                      handleBotheringDecision(
                                                        rowIndex,
                                                        b.id,
                                                        b.type,
                                                        b.text,
                                                        "pass",
                                                        botheringWhyDraft.trim()
                                                      )
                                                    }
                                                  >
                                                    Pass
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 px-2 text-[11px]"
                                                    onClick={() =>
                                                      handleBotheringDecision(
                                                        rowIndex,
                                                        b.id,
                                                        b.type,
                                                        b.text,
                                                        "fail",
                                                        botheringWhyDraft.trim()
                                                      )
                                                    }
                                                  >
                                                    Fail
                                                  </Button>
                                                </div>
                                                <Textarea
                                                  value={botheringWhyDraft}
                                                  onChange={(event) => setBotheringWhyDraft(event.target.value)}
                                                  placeholder="Why did it pass or fail?"
                                                  spellCheck={false}
                                                  autoCorrect="off"
                                                  autoCapitalize="none"
                                                  className="min-h-[56px] resize-none border-0 bg-background/40 p-2 text-[11px] text-foreground shadow-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                                />
                                              </div>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  ) : null}
                                </div>
                              );
                            };
                            return (
                              <div className="space-y-3">
                                {hasAny && (
                                  <>
                                    {makeSection("Mismatch", "mismatch")}
                                    {makeSection("Constraint", "constraint")}
                                    {makeSection("External", "external")}
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute bottom-2 right-2 h-6 w-6 rounded-full"
                                  onClick={() =>
                                    window.dispatchEvent(
                                      new CustomEvent("open-bothering-selector", {
                                        detail: { targetResourceId: `truth-row-${rowIndex}` },
                                      })
                                    )
                                  }
                                  aria-label="Add bothering"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          }
                          if (colIndex === 5) {
                            return (
                              <div className="space-y-2">
                                <Textarea
                                  value={cell}
                                  onChange={(event) => handleCellChange(rowIndex, colIndex, event.target.value)}
                                  placeholder="Why did it pass or fail?"
                                  spellCheck={false}
                                  autoCorrect="off"
                                  autoCapitalize="none"
                                  className="min-h-[64px] resize-none border-0 bg-transparent p-0 text-xs text-foreground shadow-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                                {cell.trim().length > 0 && (
                                  <Button size="sm" className="h-7 px-3 text-xs" onClick={() => handleSaveWhy(rowIndex)}>
                                    Save
                                  </Button>
                                )}
                              </div>
                            );
                          }
                          return (
                            <Textarea
                              value={cell}
                              onChange={(event) => handleCellChange(rowIndex, colIndex, event.target.value)}
                              placeholder={colIndex === 0 ? "e.g. Fear of being ignored" : "Write here..."}
                              spellCheck={false}
                              autoCorrect="off"
                              autoCapitalize="none"
                              className="min-h-[64px] resize-none border-0 bg-transparent p-0 text-xs text-foreground shadow-none ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                          );
                        })()}
                        {colIndex === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute bottom-2 right-2 h-6 w-6 rounded-full"
                            onClick={() => openImpulsePicker(rowIndex)}
                            aria-label="Pick from Resistances & Urges"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                          </div>
                          );
                        })}
                        </React.Fragment>
                      );
                    });
                  }

                  const normalizedLogs = truthLogs
                    .map((entry, index) => {
                      const statusRaw = (entry.result || "").toString().toLowerCase();
                      const status =
                        statusRaw === "pass" || statusRaw === "passed"
                          ? "pass"
                          : statusRaw === "fail" || statusRaw === "failed"
                            ? "fail"
                            : "";
                      return { entry, index, status };
                    })
                    .filter(({ entry }, idx, arr) => {
                      const fingerprint = JSON.stringify({
                        impulse: entry.impulse || "",
                        goingBeyond: entry.goingBeyond || "",
                        truth: entry.truth || "",
                        test: entry.test || "",
                        result: entry.result || "",
                        why: entry.why || "",
                      });
                      return arr.findIndex((item) => {
                        const other = item.entry;
                        return (
                          JSON.stringify({
                            impulse: other.impulse || "",
                            goingBeyond: other.goingBeyond || "",
                            truth: other.truth || "",
                            test: other.test || "",
                            result: other.result || "",
                            why: other.why || "",
                          }) === fingerprint
                        );
                      }) === idx;
                    })
                    .filter(({ status }) => status === resultFilter)
                    .filter(({ entry }) => coreStateFilter === "all" || entry.coreState === coreStateFilter);

                  const mergeKeyFor = (entry: any) =>
                    `${entry.impulseType || ""}||${entry.impulse || ""}||${entry.goingBeyond || ""}`;

                  return normalizedLogs.map(({ entry, index }, i) => {
                    const mergeKey = mergeKeyFor(entry);
                    const prevKey = i > 0 ? mergeKeyFor(normalizedLogs[i - 1].entry) : "";
                    const showMergedCols = resultFilter !== "fail" || mergeKey !== prevKey;
                    return (
                    <React.Fragment key={`log-row-${index}`}>
                      {columnLabels.map((_, colIndex) => {
                        const linkedLogBotherings =
                          colIndex === 3 && Array.isArray(entry.linkedBotherings)
                            ? entry.linkedBotherings
                                .map((b: { id: string; type: "mismatch" | "constraint" | "external" }) => {
                                  const card = mindsetCards.find((c) => c.id === `mindset_botherings_${b.type}`);
                                  const point = card?.points?.find((p) => p.id === b.id);
                                  return point ? point.text : null;
                                })
                                .filter(Boolean) as string[]
                            : [];
                        const logThreatPattern =
                          entry.patternId
                            ? patterns.find((pattern) => pattern.id === entry.patternId)
                            : entry.habitId
                              ? getPatternForHabitId(entry.habitId)
                              : null;
                        const logGrowthPattern =
                          entry.growthPatternId
                            ? patterns.find((pattern) => pattern.id === entry.growthPatternId)
                            : getGrowthPatternForThreat(logThreatPattern) || logThreatPattern;
                        const threatPatternText =
                          buildPatternPathText(logThreatPattern, "threat") || null;
                        const growthPatternText =
                          buildPatternPathText(logGrowthPattern, "growth") || null;
                        const value =
                          colIndex === 0 ? entry.impulse :
                          colIndex === 1 ? entry.goingBeyond :
                          colIndex === 2 ? entry.truth :
                          colIndex === 3 ? entry.test :
                          colIndex === 4 ? entry.result :
                          colIndex === 5 ? entry.why :
                          "";
                        return (
                          <div key={`log-${index}-${colIndex}`} className="bg-background/70 p-2 relative">
                            {colIndex === 0 ? (
                              <div className="space-y-1 text-xs">
                                {showMergedCols && entry.impulseType ? (
                                  <div className="text-muted-foreground">{entry.impulseType}</div>
                                ) : null}
                                {showMergedCols ? (
                                  <div className="font-semibold text-foreground whitespace-pre-wrap">{value}</div>
                                ) : null}
                              </div>
                            ) : colIndex === 1 ? (
                              showMergedCols && value ? (
                                <div className="text-xs text-foreground whitespace-pre-wrap">{value}</div>
                              ) : null
                            ) : colIndex === 3 && linkedLogBotherings.length > 0 ? (
                              <ul className="list-disc list-inside space-y-1 text-[11px] text-muted-foreground">
                                {linkedLogBotherings.map((text, i) => (
                                  <li key={`${index}-b-${i}`} className="whitespace-normal">
                                    {text}
                                  </li>
                                ))}
                              </ul>
                            ) : colIndex === 4 ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={String(entry.result).toLowerCase() === "pass" ? "default" : "outline"}
                                  className="h-7 px-3 text-xs"
                                  disabled
                                >
                                  Pass
                                </Button>
                                <Button
                                  size="sm"
                                  variant={String(entry.result).toLowerCase() === "fail" ? "default" : "outline"}
                                  className="h-7 px-3 text-xs"
                                  disabled
                                >
                                  Fail
                                </Button>
                              </div>
                            ) : colIndex === 1 || colIndex === 2 ? (
                              value || threatPatternText || growthPatternText ? (
                                <div className="space-y-1 text-xs">
                                  {value ? (
                                    <div className="text-foreground whitespace-pre-wrap">{value}</div>
                                  ) : null}
                                  {colIndex === 1 && threatPatternText ? (
                                    <div className="text-[11px] text-muted-foreground">Threat Pattern: {threatPatternText}</div>
                                  ) : null}
                                  {colIndex === 2 && growthPatternText ? (
                                    <div className="text-[11px] text-muted-foreground">Growth Pattern: {growthPatternText}</div>
                                  ) : null}
                                </div>
                              ) : null
                            ) : value ? (
                              <div className="text-xs text-foreground whitespace-pre-wrap">{value}</div>
                            ) : null}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                  });
                })()}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={addRow}>
                Add Row
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeRow(gridRows.length - 1)}
                disabled={gridRows.length <= 1}
              >
                Remove Last Row
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this grid to map how outward pursuits pull attention, then write the inward correction, the test, and
              the result. Changes are saved locally on this device.
            </p>

            <Dialog
              open={isImpulsePickerOpen}
              onOpenChange={(open) => {
                setIsImpulsePickerOpen(open);
                if (!open) {
                  setActiveImpulseRowIndex(null);
                  setPendingFailMove(null);
                }
              }}
            >
              <DialogContent className="max-w-[520px] border-0 bg-transparent p-0 shadow-none">
                <DialogHeader>
                  <DialogTitle className="sr-only">Resistances &amp; Urges</DialogTitle>
                </DialogHeader>
                <div className="mindset-shell shadow-2xl border backdrop-blur rounded-3xl overflow-hidden">
                  <div className="mindset-header px-5 py-4 border-b flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <Brain className="h-5 w-5 text-pink-500" />
                        Resistances &amp; Urges
                      </div>
                      <div className="text-xs text-muted-foreground">{sortedResistances.length} items</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsImpulsePickerOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-5">
                    <div className="mindset-panel rounded-2xl border p-4">
                      <div className="mindset-quickadd rounded-xl border p-3 mb-4">
                        <button
                          type="button"
                          onClick={() => setIsQuickAddOpen((prev) => !prev)}
                          className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground"
                        >
                          Quick add
                          <span className="text-[10px]">{isQuickAddOpen ? "Hide" : "Show"}</span>
                        </button>
                        {isQuickAddOpen && (
                          <div className="mt-3 space-y-3">
                            <Tabs value={newEntryType} onValueChange={(v) => setNewEntryType(v as "urge" | "resistance")} className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="urge">Urge</TabsTrigger>
                                <TabsTrigger value="resistance">Resistance</TabsTrigger>
                              </TabsList>
                            </Tabs>
                            <Input
                              value={newEntryText}
                              onChange={(e) => setNewEntryText(e.target.value)}
                              placeholder={`Describe the ${newEntryType}...`}
                            />
                            <Select onValueChange={setSelectedPatternId} value={selectedPatternId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Link to a Pattern..." />
                              </SelectTrigger>
                              <SelectContent className="z-[200]">
                                {patterns
                                  .filter((pattern) => pattern.type === "Negative")
                                  .map((pattern) => {
                                    const threatPath =
                                      buildPatternPathText(pattern, "threat") || pattern.name;
                                    return (
                                      <SelectItem key={pattern.id} value={pattern.id}>
                                        {threatPath}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                            <Button onClick={handleAddEntry} className="w-full">
                              Add
                            </Button>
                          </div>
                        )}
                      </div>
                      <ScrollArea className="h-[420px] pr-4">
                        <ul className="space-y-2">
                          {sortedResistances.map((link) => {
                            const { className: highlightClass, dormant } = getResistanceHighlightClass(link.stopper);
                            return (
                              <li
                                key={`${link.habitId ?? link.patternId}-${link.stopper.id}`}
                                className={cn("mindset-resistance-item text-sm p-2 rounded-xl transition-all border", highlightClass)}
                              >
                                <div className="flex justify-between items-start w-full text-left">
                                  <button
                                    type="button"
                                    className={cn("flex-grow pr-2 text-left", dormant && "line-through text-muted-foreground")}
                                    onClick={() => {
                                      if (editingStopperId === link.stopper.id) return;
                                      if (link.source === "pattern") {
                                        handleSelectPatternStopper(link);
                                        return;
                                      }
                                      handleSelectImpulse({
                                        text: link.stopper.text,
                                        type: link.isUrge ? "Urge" : "Resistance",
                                        habitId: link.habitId || "",
                                        stopperId: link.stopper.id,
                                      });
                                    }}
                                  >
                                    {editingStopperId === link.stopper.id ? (
                                      <div className="space-y-2">
                                        <Input
                                          value={editingStopperText}
                                          onChange={(event) => setEditingStopperText(event.target.value)}
                                          onBlur={() => {
                                            if (link.source === "pattern") return;
                                            handleSaveStopper(link.habitId || "", link.stopper.id, link.isUrge);
                                          }}
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                              event.preventDefault();
                                              if (link.source === "pattern") {
                                                handleSavePatternStopper(link.stopper.id);
                                              } else {
                                                handleSaveStopper(link.habitId || "", link.stopper.id, link.isUrge);
                                              }
                                            }
                                            if (event.key === "Escape") {
                                              event.preventDefault();
                                              handleCancelEditStopper();
                                            }
                                          }}
                                          className="h-7 text-xs"
                                          autoFocus
                                        />
                                        {link.source === "pattern" && (
                                          <div onClick={(event) => event.stopPropagation()}>
                                            <Select
                                              value={editingStopperPatternId || link.patternId || ""}
                                              onValueChange={setEditingStopperPatternId}
                                            >
                                              <SelectTrigger className="h-7 text-[11px]">
                                                <SelectValue placeholder="Select threat pattern..." />
                                              </SelectTrigger>
                                              <SelectContent className="z-[200]">
                                                {patterns
                                                  .filter((pattern) => pattern.type === "Negative")
                                                  .map((pattern) => {
                                                    const threatPath =
                                                      buildPatternPathText(pattern, "threat") || pattern.name;
                                                    return (
                                                      <SelectItem key={pattern.id} value={pattern.id}>
                                                        {threatPath}
                                                      </SelectItem>
                                                    );
                                                  })}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="font-semibold">{link.stopper.text}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {link.isUrge ? "Urge" : "Resistance"} in: {link.source === "pattern" ? link.patternName : link.habitName}
                                    </p>
                                  </button>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (editingStopperId === link.stopper.id) return;
                                        if (link.source === "pattern") {
                                          handleSelectPatternStopper(link);
                                          return;
                                        }
                                        handleSelectImpulse({
                                          text: link.stopper.text,
                                          type: link.isUrge ? "Urge" : "Resistance",
                                          habitId: link.habitId || "",
                                          stopperId: link.stopper.id,
                                        });
                                      }}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleStartEditStopper({
                                          id: link.stopper.id,
                                          text: link.stopper.text,
                                          patternId: link.patternId,
                                        });
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (link.source === "pattern") {
                                          handleDeletePatternStopper(link.stopper.id);
                                        } else {
                                          handleDeleteStopper(link.habitId || "", link.stopper.id, link.isUrge);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                    <span className="text-xs font-bold">{link.stopper.timestamps?.length || 0}</span>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                          {sortedResistances.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-8">
                              No urges or resistances are defined in your habits yet.
                            </p>
                          )}
                        </ul>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isMechanismPickerOpen}
              onOpenChange={(open) => {
                setIsMechanismPickerOpen(open);
                if (!open) setActiveMechanismRowIndex(null);
              }}
            >
              <DialogContent className="max-w-[520px] border-0 bg-transparent p-0 shadow-none">
                <div className="mindset-shell shadow-2xl border backdrop-blur rounded-3xl overflow-hidden">
                  <div className="mindset-header px-5 py-4 border-b flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <Brain className="h-5 w-5 text-emerald-500" />
                        Positive Mechanisms
                      </div>
                      <div className="text-xs text-muted-foreground">{mechanismCards.length} items</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsMechanismPickerOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-5">
                    <div className="mindset-panel rounded-2xl border p-4 space-y-3">
                      <Input
                        value={mechanismQuery}
                        onChange={(e) => setMechanismQuery(e.target.value)}
                        placeholder="Search mechanisms..."
                      />
                      <ScrollArea className="h-[420px] pr-4">
                        <ul className="space-y-2">
                          {filteredMechanisms.map((mech) => (
                            <li key={mech.id} className="mindset-resistance-item text-sm p-2 rounded-xl transition-all border">
                              <button
                                type="button"
                                className="w-full text-left font-semibold hover:underline"
                                onClick={() => handleSelectMechanism(mech.id)}
                              >
                                {mech.name}
                              </button>
                            </li>
                          ))}
                          {filteredMechanisms.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-8">No mechanisms found.</p>
                          )}
                        </ul>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isPatternPickerOpen}
              onOpenChange={(open) => {
                setIsPatternPickerOpen(open);
                if (!open) {
                  setActivePatternRowIndex(null);
                  setPatternQuery("");
                }
              }}
            >
              <DialogContent className="max-w-[520px] border-0 bg-transparent p-0 shadow-none">
                <DialogHeader>
                  <DialogTitle className="sr-only">
                    {patternPickerMode === "threat" ? "Threat Patterns" : "Growth Patterns"}
                  </DialogTitle>
                </DialogHeader>
                <div className="mindset-shell shadow-2xl border backdrop-blur rounded-3xl overflow-hidden">
                  <div className="mindset-header px-5 py-4 border-b flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-base font-semibold">
                        <Brain className="h-5 w-5 text-sky-500" />
                        {patternPickerMode === "threat" ? "Threat Patterns" : "Growth Patterns"}
                      </div>
                      <div className="text-xs text-muted-foreground">{filteredPatterns.length} items</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsPatternPickerOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-5">
                    <div className="mindset-panel rounded-2xl border p-4 space-y-3">
                      <Input
                        value={patternQuery}
                        onChange={(e) => setPatternQuery(e.target.value)}
                        placeholder="Search patterns..."
                      />
                      <ScrollArea className="h-[420px] pr-4">
                        <ul className="space-y-2">
                          {filteredPatterns.map((pattern) => {
                            const path =
                              patternPickerMode === "threat"
                                ? buildPatternPathText(pattern, "threat")
                                : buildPatternPathText(pattern, "growth");
                            const label = path || pattern.name;
                            return (
                              <li key={pattern.id} className="mindset-resistance-item text-sm p-2 rounded-xl transition-all border">
                                <button
                                  type="button"
                                  className="w-full text-left font-semibold hover:underline"
                                  onClick={() => handleSelectPattern(pattern.id)}
                                >
                                  {label}
                                </button>
                              </li>
                            );
                          })}
                          {filteredPatterns.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-8">No patterns found.</p>
                          )}
                        </ul>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TruthPage() {
  return (
    <AuthGuard>
      <TruthPageContent />
    </AuthGuard>
  );
}
