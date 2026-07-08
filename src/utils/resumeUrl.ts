import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a Supabase public URL for the resumes bucket.
 */
function extractResumePath(url: string): string | null {
  try {
    const marker = '/storage/v1/object/public/resumes/';
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(url.substring(idx + marker.length));
    }
    const signedMarker = '/storage/v1/object/sign/resumes/';
    const sIdx = url.indexOf(signedMarker);
    if (sIdx !== -1) {
      const pathWithQuery = url.substring(sIdx + signedMarker.length);
      return decodeURIComponent(pathWithQuery.split('?')[0]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns a signed URL for a resume file (valid for 1 hour).
 */
export async function getSignedResumeUrl(urlOrPath: string): Promise<string | null> {
  const path = urlOrPath.startsWith('http') ? extractResumePath(urlOrPath) : urlOrPath;
  if (!path) return urlOrPath;

  const { data, error } = await supabase.storage
    .from('resumes')
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL for resume:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Downloads the resume file as a Blob using the Supabase SDK (bypasses
 * ad-blocker URL-pattern blocking of supabase.co storage URLs).
 */
async function fetchResumeBlob(urlOrPath: string): Promise<{ blob: Blob; filename: string } | null> {
  const path = urlOrPath.startsWith('http') ? extractResumePath(urlOrPath) : urlOrPath;
  if (!path) return null;

  const { data, error } = await supabase.storage.from('resumes').download(path);
  if (error || !data) {
    console.error('Failed to download resume:', error);
    return null;
  }
  const filename = path.split('/').pop() || 'resume';
  // Ensure PDFs open inline
  const isPdf = /\.pdf$/i.test(filename);
  const blob = isPdf && data.type !== 'application/pdf'
    ? new Blob([data], { type: 'application/pdf' })
    : data;
  return { blob, filename };
}

/**
 * Opens the resume in a new tab. Tries a signed URL first, and falls back to
 * downloading via the Supabase SDK and opening a blob URL if the browser
 * (usually an ad-blocker extension) blocks the direct storage URL.
 */
export async function openResume(urlOrPath: string): Promise<void> {
  // Open the tab synchronously so popup blockers don't interfere.
  const win = window.open('about:blank', '_blank');

  // Prefer a signed https URL — Chrome blocks top-level navigation to blob:
  // URLs when the opener is a cross-origin iframe (e.g. the Lovable preview),
  // which surfaces as ERR_BLOCKED_BY_CLIENT on a blob: page.
  const signedUrl = await getSignedResumeUrl(urlOrPath);
  if (signedUrl && /^https?:\/\//i.test(signedUrl)) {
    if (win) win.location.href = signedUrl;
    else window.open(signedUrl, '_blank');
    return;
  }

  // Fallback: download via SDK and trigger a save (blob nav is unreliable
  // inside iframes, so we save the file instead of navigating to it).
  const result = await fetchResumeBlob(urlOrPath);
  if (result) {
    const blobUrl = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    if (win) win.close();
    return;
  }

  if (win) win.close();
}

/**
 * Downloads the resume via the Supabase SDK (bypasses ad blockers).
 */
export async function downloadResume(urlOrPath: string, filename?: string): Promise<void> {
  const result = await fetchResumeBlob(urlOrPath);
  if (result) {
    const blobUrl = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return;
  }

  const signedUrl = await getSignedResumeUrl(urlOrPath);
  if (signedUrl) {
    const a = document.createElement('a');
    a.href = signedUrl;
    a.download = filename || 'resume';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
