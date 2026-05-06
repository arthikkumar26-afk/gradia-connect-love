import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
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
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  job_id: string | null;
  job_title: string | null;
  employer_name: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export function CandidateNotifications({ candidateId }: { candidateId: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await supabase
      .from("candidate_notifications")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setItems(data as Notification[]);
      setUnread(data.filter((n: any) => !n.is_read).length);
    }
  };

  useEffect(() => {
    if (!candidateId) return;
    load();
    const ch = supabase
      .channel("candidate-notifs-rt")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "candidate_notifications",
          filter: `candidate_id=eq.${candidateId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 20));
          setUnread((u) => u + 1);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [candidateId]);

  const markAllRead = async () => {
    await supabase
      .from("candidate_notifications")
      .update({ is_read: true })
      .eq("candidate_id", candidateId)
      .eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const icon = (t: string) =>
    t === "job_posted" ? "🆕" : t === "job_updated" ? "✏️" : t === "job_closed" ? "🔒" : "🔔";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive text-destructive-foreground animate-pulse">
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-sm text-foreground">Notifications</h4>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (n.link) navigate(n.link);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors hover:bg-muted/50 ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex gap-2">
                  <span className="text-lg">{icon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
