import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CANDIDATE_PLANS,
  type CandidateFeature,
  type CandidatePlan,
  type PlanDefinition,
} from "@/config/candidatePlans";

interface UsageMap {
  // feature -> used count this month
  [feature: string]: number;
}

const periodStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export const useCandidateSubscription = () => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<CandidatePlan>("free");
  const [usage, setUsage] = useState<UsageMap>({});

  const planDef: PlanDefinition = CANDIDATE_PLANS[plan];

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setPlan("free");
        setUsage({});
        return;
      }
      setUserId(user.id);

      const { data: sub } = await supabase
        .from("candidate_subscriptions")
        .select("plan, status, ends_at")
        .eq("candidate_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      const active =
        sub && (sub.ends_at == null || new Date(sub.ends_at) > new Date());
      const resolvedPlan: CandidatePlan = active
        ? ((sub!.plan as CandidatePlan) ?? "free")
        : "free";
      setPlan(resolvedPlan);

      const { data: usageRows } = await supabase
        .from("candidate_feature_usage")
        .select("feature, used_count")
        .eq("candidate_id", user.id)
        .eq("period_start", periodStart());

      const map: UsageMap = {};
      (usageRows || []).forEach((row: any) => {
        map[row.feature] = row.used_count;
      });
      setUsage(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const limitFor = useCallback(
    (feature: CandidateFeature) => planDef.limits[feature] ?? 0,
    [planDef],
  );

  const usedFor = useCallback(
    (feature: CandidateFeature) => usage[feature] ?? 0,
    [usage],
  );

  const remainingFor = useCallback(
    (feature: CandidateFeature) => {
      const limit = limitFor(feature);
      if (limit === Infinity) return Infinity;
      return Math.max(0, limit - usedFor(feature));
    },
    [limitFor, usedFor],
  );

  const canUse = useCallback(
    (feature: CandidateFeature) => remainingFor(feature) > 0,
    [remainingFor],
  );

  /** Increment usage by 1 for a feature. Resolves true if recorded, false if quota exceeded. */
  const consume = useCallback(
    async (feature: CandidateFeature): Promise<boolean> => {
      if (!userId) return false;
      const limit = limitFor(feature);
      const used = usedFor(feature);
      if (limit !== Infinity && used >= limit) return false;

      const ps = periodStart();
      // Upsert usage row
      const { data: existing } = await supabase
        .from("candidate_feature_usage")
        .select("id, used_count")
        .eq("candidate_id", userId)
        .eq("feature", feature)
        .eq("period_start", ps)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("candidate_feature_usage")
          .update({ used_count: existing.used_count + 1 })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("candidate_feature_usage")
          .insert({
            candidate_id: userId,
            feature,
            period_start: ps,
            used_count: 1,
          });
      }
      setUsage((prev) => ({ ...prev, [feature]: (prev[feature] ?? 0) + 1 }));
      return true;
    },
    [userId, limitFor, usedFor],
  );

  return {
    loading,
    userId,
    plan,
    planDef,
    usage,
    limitFor,
    usedFor,
    remainingFor,
    canUse,
    consume,
    refresh,
  };
};
