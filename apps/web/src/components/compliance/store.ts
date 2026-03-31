import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { isScreenshotMode } from "../../lib/screenshotMode";
import type {
  ComplianceAssessment,
  RemediationTask,
  ComplianceReport,
  Policy,
} from "./types";

// ── localStorage cache for offline / fallback ──
const STORAGE_KEY = "compliance_guard_data";

interface StoreData {
  assessments: ComplianceAssessment[];
  tasks: RemediationTask[];
  reports: ComplianceReport[];
  policies: Policy[];
}

function loadCache(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { assessments: [], tasks: [], reports: [], policies: [] };
}

function saveCache(data: StoreData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

// ── Helpers: map DB rows ↔ TS types (created_at ↔ created_date) ──
function rowToPolicy(r: Record<string, unknown>): Policy {
  return {
    id: r.id as string,
    title: r.title as string,
    status: r.status as Policy["status"],
    category: r.category as string | undefined,
    compliance_score: r.compliance_score as number | undefined,
    file_url: r.file_url as string | undefined,
    nca_controls_mapped: r.nca_controls_mapped as string[] | undefined,
    analysis_result: r.analysis_result as Record<string, unknown> | undefined,
    created_date: r.created_at as string,
  };
}

function rowToAssessment(r: Record<string, unknown>): ComplianceAssessment {
  return {
    id: r.id as string,
    name: r.name as string,
    framework: r.framework as string,
    status: r.status as ComplianceAssessment["status"],
    overall_score: (r.overall_score ?? 0) as number,
    results: (r.results ?? []) as ComplianceAssessment["results"],
    comments: (r.comments ?? []) as ComplianceAssessment["comments"],
    created_date: r.created_at as string,
  };
}

function rowToTask(r: Record<string, unknown>): RemediationTask {
  return {
    id: r.id as string,
    title: r.title as string,
    description: r.description as string,
    control_id: r.control_id as string | undefined,
    assessment_id: r.assessment_id as string | undefined,
    priority: r.priority as RemediationTask["priority"],
    status: r.status as RemediationTask["status"],
    assigned_to: r.assigned_to as string | undefined,
    due_date: r.due_date as string | undefined,
    ai_guidance: r.ai_guidance as RemediationTask["ai_guidance"],
    comments: (r.comments ?? []) as RemediationTask["comments"],
    created_date: r.created_at as string,
  };
}

function rowToReport(r: Record<string, unknown>): ComplianceReport {
  return {
    id: r.id as string,
    title: r.title as string,
    type: r.type as string,
    assessment_id: r.assessment_id as string | undefined,
    framework: r.framework as string | undefined,
    content: r.content as ComplianceReport["content"],
    created_date: r.created_at as string,
  };
}

// ── React hook ──
export function useComplianceStore() {
  const { user } = useAuth();
  const userId = user?.id;
  const screenshotMode = isScreenshotMode();
  const [data, setData] = useState<StoreData>(loadCache);
  const loaded = useRef(false);

  // Load all data from Supabase when user authenticates
  useEffect(() => {
    if (screenshotMode) {
      loaded.current = true;
      return;
    }

    if (!userId || loaded.current) return;
    loaded.current = true;

    (async () => {
      const [pRes, aRes, tRes, rRes] = await Promise.all([
        supabase.from("policies").select("*").order("created_at", { ascending: false }),
        supabase.from("assessments").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("reports").select("*").order("created_at", { ascending: false }),
      ]);

      const fresh: StoreData = {
        policies: (pRes.data ?? []).map(rowToPolicy),
        assessments: (aRes.data ?? []).map(rowToAssessment),
        tasks: (tRes.data ?? []).map(rowToTask),
        reports: (rRes.data ?? []).map(rowToReport),
      };

      setData(fresh);
      saveCache(fresh);
    })();
  }, [screenshotMode, userId]);

  // Reset loaded flag when user changes
  useEffect(() => {
    loaded.current = false;
  }, [userId]);

  const update = useCallback((updater: (prev: StoreData) => StoreData) => {
    setData((prev) => {
      const next = updater(prev);
      saveCache(next);
      return next;
    });
  }, []);

  // ── Policies ──
  const addPolicy = useCallback(async (p: Omit<Policy, "id" | "created_date">) => {
    if (!userId) return "";
    const { data: row, error } = await supabase
      .from("policies")
      .insert({ user_id: userId, title: p.title, status: p.status, category: p.category ?? null, compliance_score: p.compliance_score ?? null, file_url: p.file_url ?? null, nca_controls_mapped: p.nca_controls_mapped ?? [], analysis_result: p.analysis_result ?? null })
      .select()
      .single();
    if (error || !row) { console.error("addPolicy", error); return ""; }
    const policy = rowToPolicy(row);
    update((d) => ({ ...d, policies: [policy, ...d.policies] }));
    return policy.id;
  }, [userId, update]);

  const updatePolicy = useCallback(async (id: string, patch: Partial<Policy>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.category !== undefined) dbPatch.category = patch.category;
    if (patch.compliance_score !== undefined) dbPatch.compliance_score = patch.compliance_score;
    if (patch.file_url !== undefined) dbPatch.file_url = patch.file_url;
    if (patch.nca_controls_mapped !== undefined) dbPatch.nca_controls_mapped = patch.nca_controls_mapped;
    if (patch.analysis_result !== undefined) dbPatch.analysis_result = patch.analysis_result;
    await supabase.from("policies").update(dbPatch).eq("id", id);
    update((d) => ({ ...d, policies: d.policies.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }, [update]);

  const deletePolicy = useCallback(async (id: string) => {
    await supabase.from("policies").delete().eq("id", id);
    update((d) => ({ ...d, policies: d.policies.filter((x) => x.id !== id) }));
  }, [update]);

  // ── Assessments ──
  const addAssessment = useCallback(async (a: Omit<ComplianceAssessment, "id" | "created_date">) => {
    if (!userId) return "";
    const { data: row, error } = await supabase
      .from("assessments")
      .insert({ user_id: userId, name: a.name, framework: a.framework, status: a.status, overall_score: a.overall_score, results: a.results ?? [], comments: a.comments ?? [] })
      .select()
      .single();
    if (error || !row) { console.error("addAssessment", error); return ""; }
    const assessment = rowToAssessment(row);
    update((d) => ({ ...d, assessments: [assessment, ...d.assessments] }));
    return assessment.id;
  }, [userId, update]);

  const updateAssessment = useCallback(async (id: string, patch: Partial<ComplianceAssessment>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.framework !== undefined) dbPatch.framework = patch.framework;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.overall_score !== undefined) dbPatch.overall_score = patch.overall_score;
    if (patch.results !== undefined) dbPatch.results = patch.results;
    if (patch.comments !== undefined) dbPatch.comments = patch.comments;
    await supabase.from("assessments").update(dbPatch).eq("id", id);
    update((d) => ({ ...d, assessments: d.assessments.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }, [update]);

  const deleteAssessment = useCallback(async (id: string) => {
    // Cascade: also delete tasks linked to this assessment
    await supabase.from("tasks").delete().eq("assessment_id", id);
    await supabase.from("assessments").delete().eq("id", id);
    update((d) => ({
      ...d,
      assessments: d.assessments.filter((x) => x.id !== id),
      tasks: d.tasks.filter((x) => x.assessment_id !== id),
    }));
  }, [update]);

  // ── Tasks ──
  const addTask = useCallback(async (t: Omit<RemediationTask, "id" | "created_date">) => {
    if (!userId) return "";
    const { data: row, error } = await supabase
      .from("tasks")
      .insert({ user_id: userId, title: t.title, description: t.description, control_id: t.control_id ?? null, assessment_id: t.assessment_id ?? null, priority: t.priority, status: t.status, assigned_to: t.assigned_to ?? null, due_date: t.due_date ?? null, ai_guidance: t.ai_guidance ?? null, comments: t.comments ?? [] })
      .select()
      .single();
    if (error || !row) { console.error("addTask", error); return ""; }
    const task = rowToTask(row);
    update((d) => ({ ...d, tasks: [task, ...d.tasks] }));
    return task.id;
  }, [userId, update]);

  const updateTask = useCallback(async (id: string, patch: Partial<RemediationTask>) => {
    const dbPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.description !== undefined) dbPatch.description = patch.description;
    if (patch.control_id !== undefined) dbPatch.control_id = patch.control_id;
    if (patch.priority !== undefined) dbPatch.priority = patch.priority;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.assigned_to !== undefined) dbPatch.assigned_to = patch.assigned_to;
    if (patch.due_date !== undefined) dbPatch.due_date = patch.due_date;
    if (patch.ai_guidance !== undefined) dbPatch.ai_guidance = patch.ai_guidance;
    if (patch.comments !== undefined) dbPatch.comments = patch.comments;
    await supabase.from("tasks").update(dbPatch).eq("id", id);
    update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  }, [update]);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) }));
  }, [update]);

  const deleteAllTasks = useCallback(async () => {
    if (!userId) return;
    await supabase.from("tasks").delete().eq("user_id", userId);
    update((d) => ({ ...d, tasks: [] }));
  }, [userId, update]);

  // ── Reports ──
  const addReport = useCallback(async (r: Omit<ComplianceReport, "id" | "created_date">) => {
    if (!userId) return "";
    const { data: row, error } = await supabase
      .from("reports")
      .insert({ user_id: userId, title: r.title, type: r.type, assessment_id: r.assessment_id ?? null, framework: r.framework ?? null, content: r.content ?? {} })
      .select()
      .single();
    if (error || !row) { console.error("addReport", error); return ""; }
    const report = rowToReport(row);
    update((d) => ({ ...d, reports: [report, ...d.reports] }));
    return report.id;
  }, [userId, update]);

  const deleteReport = useCallback(async (id: string) => {
    await supabase.from("reports").delete().eq("id", id);
    update((d) => ({ ...d, reports: d.reports.filter((x) => x.id !== id) }));
  }, [update]);

  return {
    ...data,
    addAssessment,
    updateAssessment,
    deleteAssessment,
    addTask,
    updateTask,
    deleteTask,
    deleteAllTasks,
    addReport,
    deleteReport,
    addPolicy,
    updatePolicy,
    deletePolicy,
  };
}
