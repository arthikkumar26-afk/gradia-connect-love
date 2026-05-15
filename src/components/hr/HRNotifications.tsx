import { useEffect, useRef, useState } from "react";
import { Bell, FileText, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type HRNotifType = "resume" | "vacancy";

interface HRNotif {
  id: string;
  type: HRNotifType;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

const STORAGE_KEY = "hr_notifications_v1";
const MAX_ITEMS = 30;

function loadStored(): HRNotif[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HRNotif[];
  } catch {
    return [];
  }
}

function saveStored(items: HRNotif[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* ignore */
  }
}

export function HRNotifications() {
  const [items, setItems] = useState<HRNotif[]>(() => loadStored());
  const [open, setOpen] = useState(false);
  const mountedAtRef = useRef<number>(Date.now());

  const unreadCount = items.filter((n) => !n.is_read).length;

  useEffect(() => {
    saveStored(items);
  }, [items]);

  const pushNotif = (n: Omit<HRNotif, "is_read">) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === n.id)) return prev;
      return [{ ...n, is_read: false }, ...prev].slice(0, MAX_ITEMS);
    });
    // Bottom-right popup that auto-dismisses (1s as requested)
    toast.message(n.title, {
      description: n.message,
      duration: 1000,
      position: "bottom-right",
      icon: n.type === "resume" ? "📄" : "💼",
    });
  };

  useEffect(() => {
    const resumeChannel = supabase
      .channel("hr-notif-resumes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "candidate_resumes" },
        (payload) => {
          // Avoid showing past inserts that may arrive on initial sync
          const row = payload.new as any;
          const created = new Date(row.created_at || Date.now()).getTime();
          if (created < mountedAtRef.current - 5000) return;
          const name = row.full_name || row.email || "A candidate";
          pushNotif({
            id: `resume-${row.id}`,
            type: "resume",
            title: "New resume submitted",
            message: `${name} just sent a resume.`,
            created_at: row.created_at || new Date().toISOString(),
          });
        }
      )
      .subscribe();

    const jobsChannel = supabase
      .channel("hr-notif-jobs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jobs" },
        (payload) => {
          const row = payload.new as any;
          const created = new Date(row.created_at || Date.now()).getTime();
          if (created < mountedAtRef.current - 5000) return;
          pushNotif({
            id: `job-${row.id}`,
            type: "vacancy",
            title: "New vacancy posted",
            message: `${row.job_title || "A new role"}${
              row.location ? ` · ${row.location}` : ""
            }`,
            created_at: row.created_at || new Date().toISOString(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(resumeChannel);
      supabase.removeChannel(jobsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const clearAll = () => {
    setItems([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
            {items.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAll}>
                Clear
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`flex gap-2 px-4 py-3 border-b border-border last:border-0 ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
              >
                <span className="mt-0.5">
                  {n.type === "resume" ? (
                    <FileText className="h-4 w-4 text-primary" />
                  ) : (
                    <Briefcase className="h-4 w-4 text-primary" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default HRNotifications;
