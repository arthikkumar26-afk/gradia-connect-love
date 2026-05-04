import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CandidateTransferInfo {
  candidate_id: string;
  hr_user_id: string;
  hr_name: string;
  created_at: string;
}

export interface EmployerTransferInfo {
  employer_id: string;
  hr_user_id: string;
  hr_name: string;
  job_id: string | null;
  created_at: string;
}

/**
 * For an EMPLOYER: returns candidates that HR has transferred to this employer,
 * keyed by candidate_id, with HR attribution.
 */
export function useCandidatesTransferredToEmployer(employerId: string | undefined) {
  const [map, setMap] = useState<Record<string, CandidateTransferInfo>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!employerId) {
      setMap({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("hr_candidate_transfers")
      .select("candidate_id, hr_user_id, created_at")
      .eq("employer_id", employerId);
    if (error) {
      console.error("[useCandidatesTransferredToEmployer]", error);
      setMap({});
      setLoading(false);
      return;
    }
    const hrIds = Array.from(new Set((data ?? []).map((r) => r.hr_user_id)));
    const { data: hrs } = hrIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", hrIds)
      : { data: [] as any[] };
    const nameById = Object.fromEntries((hrs ?? []).map((p: any) => [p.id, p.full_name || "HR"]));
    const out: Record<string, CandidateTransferInfo> = {};
    (data ?? []).forEach((r: any) => {
      out[r.candidate_id] = {
        candidate_id: r.candidate_id,
        hr_user_id: r.hr_user_id,
        hr_name: nameById[r.hr_user_id] || "HR",
        created_at: r.created_at,
      };
    });
    setMap(out);
    setLoading(false);
  }, [employerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { map, loading, refresh };
}

/**
 * For a CANDIDATE: returns employers (and optional jobs) that HR has transferred
 * to this candidate, keyed by employer_id, with HR attribution.
 */
export function useEmployersTransferredToCandidate(candidateId: string | undefined) {
  const [map, setMap] = useState<Record<string, EmployerTransferInfo>>({});
  const [jobMap, setJobMap] = useState<Record<string, EmployerTransferInfo>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!candidateId) {
      setMap({});
      setJobMap({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("hr_employer_transfers")
      .select("employer_id, hr_user_id, job_id, created_at")
      .eq("candidate_id", candidateId);
    if (error) {
      console.error("[useEmployersTransferredToCandidate]", error);
      setMap({});
      setJobMap({});
      setLoading(false);
      return;
    }
    const hrIds = Array.from(new Set((data ?? []).map((r) => r.hr_user_id)));
    const { data: hrs } = hrIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", hrIds)
      : { data: [] as any[] };
    const nameById = Object.fromEntries((hrs ?? []).map((p: any) => [p.id, p.full_name || "HR"]));
    const eOut: Record<string, EmployerTransferInfo> = {};
    const jOut: Record<string, EmployerTransferInfo> = {};
    (data ?? []).forEach((r: any) => {
      const info: EmployerTransferInfo = {
        employer_id: r.employer_id,
        hr_user_id: r.hr_user_id,
        hr_name: nameById[r.hr_user_id] || "HR",
        job_id: r.job_id,
        created_at: r.created_at,
      };
      // employer-level access (no job_id) grants access to all jobs of that employer
      if (!r.job_id) eOut[r.employer_id] = info;
      if (r.job_id) jOut[r.job_id] = info;
    });
    setMap(eOut);
    setJobMap(jOut);
    setLoading(false);
  }, [candidateId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { employerMap: map, jobMap, loading, refresh };
}
