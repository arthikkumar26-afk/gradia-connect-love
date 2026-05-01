// Lightweight client-side store for CV Scrutiny email send history.
// Persisted to localStorage so the dedicated "Email Status" tab can show
// results even after navigating away from CV Scrutiny.

export type HREmailStatus = "sent" | "failed" | "sending";

export interface HREmailRecord {
  id: string;            // unique log id
  rowId: string;         // CV Scrutiny row id (for update on retry)
  candidateName: string;
  candidateEmail: string;
  fileName: string;
  jobTitle: string;
  score: number | null;
  subject: string;
  status: HREmailStatus;
  error?: string;
  sentAt: string;        // ISO timestamp of last attempt
  attempts: number;
}

const KEY = "hr_cv_scrutiny_email_log_v1";
const EVENT = "hr_cv_scrutiny_email_log_changed";
const MAX_RECORDS = 500;

function read(): HREmailRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: HREmailRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_RECORDS)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ignore quota errors
  }
}

export function getEmailRecords(): HREmailRecord[] {
  return read();
}

export function clearEmailRecords() {
  write([]);
}

/**
 * Upsert one record. If a record with the same rowId+email exists,
 * update it (incrementing attempts) instead of adding a duplicate.
 */
export function upsertEmailRecord(rec: Omit<HREmailRecord, "id" | "attempts"> & { id?: string }) {
  const list = read();
  const key = `${rec.rowId}::${rec.candidateEmail.toLowerCase()}`;
  const idx = list.findIndex(r => `${r.rowId}::${r.candidateEmail.toLowerCase()}` === key);
  if (idx >= 0) {
    const prev = list[idx];
    list[idx] = {
      ...prev,
      ...rec,
      id: prev.id,
      attempts: prev.attempts + 1,
    };
  } else {
    list.unshift({
      ...rec,
      id: rec.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      attempts: 1,
    });
  }
  write(list);
}

export function subscribeEmailRecords(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
