import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a Supabase public URL for the resumes bucket.
 * E.g. "https://xxx.supabase.co/storage/v1/object/public/resumes/userId/file.pdf"
 *   → "userId/file.pdf"
 */
function extractResumePath(url: string): string | null {
  try {
    const marker = '/storage/v1/object/public/resumes/';
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(url.substring(idx + marker.length));
    }
    // Also handle signed URL format
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
 * Accepts either a full public URL or a storage path.
 */
export async function getSignedResumeUrl(urlOrPath: string): Promise<string | null> {
  const path = urlOrPath.startsWith('http') ? extractResumePath(urlOrPath) : urlOrPath;
  if (!path) return urlOrPath; // fallback to original if can't parse

  const { data, error } = await supabase.storage
    .from('resumes')
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL for resume:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Opens the resume in a new tab using a signed URL.
 */
export async function openResume(urlOrPath: string): Promise<void> {
  const signedUrl = await getSignedResumeUrl(urlOrPath);
  if (signedUrl) {
    window.open(signedUrl, '_blank');
  }
}

/**
 * Downloads the resume using a signed URL.
 */
export async function downloadResume(urlOrPath: string, filename?: string): Promise<void> {
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
