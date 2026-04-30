import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UnlockFeature } from "@/config/featureUnlocks";

interface UnlockRow {
  feature: string;
  expires_at: string;
}

export const useFeatureUnlocks = () => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [unlocks, setUnlocks] = useState<Record<string, string>>({}); // feature -> expires_at iso

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserId(null);
        setUnlocks({});
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("candidate_feature_unlocks" as any)
        .select("feature, expires_at")
        .eq("candidate_id", user.id)
        .gt("expires_at", new Date().toISOString());
      const map: Record<string, string> = {};
      ((data as UnlockRow[]) || []).forEach((r) => {
        // keep latest expiry per feature
        if (!map[r.feature] || new Date(r.expires_at) > new Date(map[r.feature])) {
          map[r.feature] = r.expires_at;
        }
      });
      setUnlocks(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isUnlocked = useCallback(
    (feature: UnlockFeature) => Boolean(unlocks[feature]),
    [unlocks],
  );

  const expiresAt = useCallback(
    (feature: UnlockFeature) => unlocks[feature] || null,
    [unlocks],
  );

  return { loading, userId, unlocks, isUnlocked, expiresAt, refresh };
};
