import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has admin role
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to get all stats
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get total users count
    const { count: totalUsers } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Get candidates count
    const { count: totalCandidates } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "candidate");

    // Get employers count (companies)
    const { count: totalCompanies } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "employer");

    // Get active jobs count
    const { count: activeJobs } = await adminClient
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get total jobs count
    const { count: totalJobs } = await adminClient
      .from("jobs")
      .select("*", { count: "exact", head: true });

    // Get placements (hired candidates)
    const { count: placements } = await adminClient
      .from("interview_candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "hired");

    // Get pending job approvals (draft or pending status)
    const { count: pendingJobs } = await adminClient
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Get sponsors count
    const { count: totalSponsors } = await adminClient
      .from("sponsors")
      .select("*", { count: "exact", head: true });

    // Get active sponsors count
    const { count: activeSponsors } = await adminClient
      .from("sponsors")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get recent activities (last 5 profiles created)
    const { data: recentUsers } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    // Get recent jobs
    const { data: recentJobs } = await adminClient
      .from("jobs")
      .select("id, job_title, employer_id, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5);

    // ============ Web traffic-like stats derived from profiles ============
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const startWindow = new Date(now.getTime() - 7 * dayMs);
    startWindow.setHours(0, 0, 0, 0);

    const { count: newUsers7d } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startWindow.toISOString());

    const { count: activeUsers7d } = await adminClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", startWindow.toISOString());

    const { data: recentProfileRows } = await adminClient
      .from("profiles")
      .select("created_at, updated_at")
      .gte("created_at", startWindow.toISOString())
      .limit(5000);

    const { data: recentActiveRows } = await adminClient
      .from("profiles")
      .select("updated_at")
      .gte("updated_at", startWindow.toISOString())
      .limit(5000);

    const days: { date: string; label: string; newUsers: number; activeUsers: number; visitors: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * dayMs);
      d.setHours(0, 0, 0, 0);
      days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        newUsers: 0,
        activeUsers: 0,
        visitors: 0,
      });
    }
    const dayIndex = new Map(days.map((d, i) => [d.date, i]));

    (recentProfileRows || []).forEach((r) => {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      const i = dayIndex.get(key);
      if (i !== undefined) days[i].newUsers += 1;
    });
    (recentActiveRows || []).forEach((r) => {
      const key = new Date(r.updated_at).toISOString().slice(0, 10);
      const i = dayIndex.get(key);
      if (i !== undefined) days[i].activeUsers += 1;
    });
    // Visitors ~ combined signal (unique = max of the two per day as a proxy)
    days.forEach((d) => {
      d.visitors = Math.max(d.newUsers, d.activeUsers);
    });

    const visitors7d = days.reduce((s, d) => s + d.visitors, 0);

    // Get applications count
    const { count: totalApplications } = await adminClient
      .from("applications")
      .select("*", { count: "exact", head: true });

    // Calculate some growth metrics (simplified - comparing to previous month would need date filtering)
    const stats = {
      totalUsers: totalUsers || 0,
      totalCandidates: totalCandidates || 0,
      totalCompanies: totalCompanies || 0,
      activeJobs: activeJobs || 0,
      totalJobs: totalJobs || 0,
      placements: placements || 0,
      pendingJobs: pendingJobs || 0,
      totalSponsors: totalSponsors || 0,
      activeSponsors: activeSponsors || 0,
      totalApplications: totalApplications || 0,
      recentUsers: recentUsers || [],
      recentJobs: recentJobs || [],
      traffic: {
        visitors7d,
        newUsers7d: newUsers7d || 0,
        activeUsers7d: activeUsers7d || 0,
        series: days,
      },
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error fetching admin stats:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});