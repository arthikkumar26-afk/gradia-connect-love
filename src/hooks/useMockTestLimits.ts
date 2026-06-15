import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MockTestLimits {
  plan: string;
  maxTests: number;
  usedTests: number;
  remainingTests: number;
  canStart: boolean;
  isLoading: boolean;
  paidExtras: number;
  extraTestPrice: number;
  refetch: () => Promise<void>;
}

const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  starter: 5,
  advance: 15,
  pro_accelerator: 40,
  elite: Infinity,
};

const EXTRA_TEST_PRICE = 149;

export const useMockTestLimits = (userId: string | undefined): MockTestLimits => {
  const [plan, setPlan] = useState("free");
  const [usedTests, setUsedTests] = useState(0);
  const [paidExtras, setPaidExtras] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLimits = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data: sub } = await supabase
        .from("candidate_subscriptions")
        .select("plan, status, ends_at")
        .eq("candidate_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let activePlan = "free";
      if (sub) {
        if (!sub.ends_at || new Date(sub.ends_at) > new Date()) {
          activePlan = sub.plan;
        }
      }
      setPlan(activePlan);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count } = await supabase
        .from("mock_interview_sessions")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", userId)
        .gte("created_at", monthStart);

      setUsedTests(count || 0);

      setPaidExtras(0);
    } catch (error) {
      console.error("Error fetching mock test limits:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const baseMax = PLAN_LIMITS[plan] ?? 1;
  const maxTests = baseMax === Infinity ? Infinity : baseMax + paidExtras;
  const remainingTests = maxTests === Infinity ? Infinity : Math.max(0, maxTests - usedTests);
  const canStart = plan === "elite" || usedTests < maxTests;

  return {
    plan,
    maxTests,
    usedTests,
    remainingTests,
    canStart,
    isLoading,
    paidExtras,
    extraTestPrice: EXTRA_TEST_PRICE,
    refetch: fetchLimits,
  };
};
