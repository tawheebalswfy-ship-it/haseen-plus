import { supabase } from "./supabase";

const BUCKET = "policy-files";
const EVIDENCE_BUCKET = "evidence-files";

/**
 * Upload a policy file to Supabase Storage.
 * Files are stored under `{userId}/{filename}` for RLS isolation.
 */
export async function uploadPolicyFile(
  userId: string,
  file: File
): Promise<{ path: string; error: string | null }> {
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = `${userId}/${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return { path: "", error: error.message };
  }
  return { path: data.path, error: null };
}

/**
 * Download a policy file from storage.
 */
export async function downloadPolicyFile(
  filePath: string
): Promise<{ blob: Blob | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(filePath);

  if (error) {
    return { blob: null, error: error.message };
  }
  return { blob: data, error: null };
}

/**
 * Get a signed URL for a policy file (valid for 1 hour).
 */
export async function getPolicyFileUrl(
  filePath: string
): Promise<{ url: string; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error) {
    return { url: "", error: error.message };
  }
  return { url: data.signedUrl, error: null };
}

/**
 * Delete a policy file from storage.
 */
export async function deletePolicyFile(
  filePath: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  return { error: error?.message ?? null };
}

/**
 * List all policy files for a user.
 */
export async function listPolicyFiles(
  userId: string
): Promise<{ files: { name: string; size: number; created_at: string }[]; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(userId, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    return { files: [], error: error.message };
  }

  return {
    files: (data ?? []).map((f) => ({
      name: f.name,
      size: f.metadata?.size ?? 0,
      created_at: f.created_at ?? "",
    })),
    error: null,
  };
}

// ── Evidence Files ──

/**
 * Upload an evidence file to Supabase Storage.
 * Files are stored under `{userId}/{assessmentId}/{filename}` for RLS isolation.
 */
export async function uploadEvidenceFile(
  userId: string,
  assessmentId: string,
  file: File
): Promise<{ path: string; error: string | null }> {
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = `${userId}/${assessmentId}/${safeName}`;

  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return { path: "", error: error.message };
  }
  return { path: data.path, error: null };
}

/**
 * Get a signed URL for an evidence file (valid for 1 hour).
 */
export async function getEvidenceFileUrl(
  filePath: string
): Promise<{ url: string; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(filePath, 3600);

  if (error) {
    return { url: "", error: error.message };
  }
  return { url: data.signedUrl, error: null };
}

/**
 * Delete an evidence file from storage.
 */
export async function deleteEvidenceFile(
  filePath: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .remove([filePath]);

  return { error: error?.message ?? null };
}

/**
 * Download an evidence file as a Blob.
 */
export async function downloadEvidenceFile(
  filePath: string
): Promise<{ blob: Blob | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .download(filePath);

  if (error) {
    return { blob: null, error: error.message };
  }
  return { blob: data, error: null };
}
