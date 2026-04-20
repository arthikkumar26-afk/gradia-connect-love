import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const INTERVIEW_UNLOCK_COST = 1000;

/**
 * Shared hook that gates candidate interview/profile actions behind a
 * 1000-point wallet redemption. One unlock per (employer, candidate).
 */
export const useInterviewUnlock = () => {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [pendingCandidate, setPendingCandidate] = useState<{
    id: string;
    name: string;
    interviewCandidateId?: string | null;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [walletPoints, setWalletPoints] = useState<number>(0);
  const [unlocking, setUnlocking] = useState(false);

  // Preload existing unlocks for this employer
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from("interview_unlocks")
        .select("candidate_id")
        .eq("employer_id", user.id);
      if (data) setUnlockedIds(new Set(data.map((r: any) => r.candidate_id)));
    })();
  }, []);

  const requireUnlock = useCallback(
    async (
      candidate: { id: string; name: string; interviewCandidateId?: string | null },
      action: () => void
    ) => {
      if (unlockedIds.has(candidate.id)) {
        action();
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }
      // DB double-check
      const { data: existing } = await (supabase as any)
        .from("interview_unlocks")
        .select("id")
        .eq("employer_id", user.id)
        .eq("candidate_id", candidate.id)
        .maybeSingle();
      if (existing) {
        setUnlockedIds((prev) => new Set(prev).add(candidate.id));
        action();
        return;
      }
      const { data: wallet } = await supabase
        .from("wallets")
        .select("points_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      setWalletPoints(wallet?.points_balance ?? 0);
      setPendingCandidate(candidate);
      setPendingAction(() => action);
    },
    [unlockedIds]
  );

  const confirmUnlock = useCallback(async () => {
    if (!pendingCandidate) return;
    setUnlocking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, points_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!wallet) throw new Error("Wallet not found. Please load points first.");

      const balance = wallet.points_balance ?? 0;
      if (balance < INTERVIEW_UNLOCK_COST) {
        toast.error(
          `Insufficient points. You need ${INTERVIEW_UNLOCK_COST} pts but have ${balance} pts.`
        );
        return;
      }

      // Insert unlock first (unique constraint protects against double-charge)
      const { error: insErr } = await (supabase as any)
        .from("interview_unlocks")
        .insert({
          employer_id: user.id,
          candidate_id: pendingCandidate.id,
          interview_candidate_id: pendingCandidate.interviewCandidateId ?? null,
          points_spent: INTERVIEW_UNLOCK_COST,
        });
      if (insErr && !String(insErr.message || "").toLowerCase().includes("duplicate")) {
        throw insErr;
      }

      // Deduct points
      const { error: updErr } = await supabase
        .from("wallets")
        .update({ points_balance: balance - INTERVIEW_UNLOCK_COST })
        .eq("id", wallet.id);
      if (updErr) throw updErr;

      // Log txn (non-fatal)
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "debit",
        category: "interview_unlock",
        amount: 0,
        points: INTERVIEW_UNLOCK_COST,
        description: `Interview unlock for ${pendingCandidate.name}`,
      });

      setUnlockedIds((prev) => new Set(prev).add(pendingCandidate.id));
      toast.success(`Interview access unlocked! ${INTERVIEW_UNLOCK_COST} pts deducted.`);

      const action = pendingAction;
      setPendingCandidate(null);
      setPendingAction(null);
      action?.();
    } catch (e: any) {
      console.error("Interview unlock error:", e);
      toast.error(e.message || "Failed to redeem points");
    } finally {
      setUnlocking(false);
    }
  }, [pendingCandidate, pendingAction]);

  const cancelUnlock = useCallback(() => {
    setPendingCandidate(null);
    setPendingAction(null);
  }, []);

  return {
    unlockedIds,
    requireUnlock,
    confirmUnlock,
    cancelUnlock,
    pendingCandidate,
    walletPoints,
    unlocking,
    INTERVIEW_UNLOCK_COST,
  };
};
