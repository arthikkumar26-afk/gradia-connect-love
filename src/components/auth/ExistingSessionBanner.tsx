import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, UserCheck } from "lucide-react";

const dashboardFor = (role?: string | null) => {
  switch (role) {
    case "admin": return "/admin/dashboard";
    case "owner": return "/owner/dashboard";
    case "employer": return "/employer/dashboard";
    case "hr":
    case "hr_manager": return "/employer/dashboard";
    case "freelancer": return "/freelancer/dashboard";
    case "edutech": return "/edutech/dashboard";
    default: return "/candidate/dashboard";
  }
};

/** Shown on login pages when someone is already signed in, so they can continue or switch account. */
const ExistingSessionBanner = () => {
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ name: string; email: string; role: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setInfo(null); return; }
    const { data: profile } = await supabase
      .from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
    setInfo({
      name: profile?.full_name || user.email?.split("@")[0] || "User",
      email: user.email || "",
      role: profile?.role ?? null,
    });
  };

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setInfo(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!info) return null;

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("userRole");
    } catch { /* ignore */ }
    setInfo(null);
    setBusy(false);
  };

  return (
    <div className="container mx-auto px-4 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <UserCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">
            You're already signed in as <strong>{info.name}</strong>
            {info.email && <span className="text-muted-foreground"> ({info.email})</span>}.
            Sign out first to log in with a different account.
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => navigate(dashboardFor(info.role))}>
            <LayoutDashboard className="h-4 w-4 mr-1" /> My Dashboard
          </Button>
          <Button size="sm" onClick={signOut} disabled={busy}>
            <LogOut className="h-4 w-4 mr-1" /> {busy ? "Signing out..." : "Sign out & switch"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExistingSessionBanner;
