import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  candidate_id: string;
  hr_id: string | null;
  sender_role: "candidate" | "hr";
  content: string;
  created_at: string;
  read_at: string | null;
}

interface CandidateInfo {
  id: string;
  full_name: string | null;
  email: string | null;
  profile_picture: string | null;
}

const HRChatPanel = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [candidates, setCandidates] = useState<Record<string, CandidateInfo>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadAll = async () => {
    setLoading(true);
    const { data: msgs } = await supabase
      .from("hr_chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1000);
    const list = (msgs as ChatMessage[]) || [];
    setMessages(list);

    const ids = Array.from(new Set(list.map((m) => m.candidate_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, profile_picture")
        .in("id", ids);
      const map: Record<string, CandidateInfo> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p; });
      setCandidates(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadAll();
    const channel = supabase
      .channel("hr_chat_panel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hr_chat_messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          // Lazy-load profile for new candidate
          if (!candidates[msg.candidate_id]) {
            supabase.from("profiles").select("id, full_name, email, profile_picture")
              .eq("id", msg.candidate_id).maybeSingle().then(({ data }) => {
                if (data) setCandidates((c) => ({ ...c, [data.id]: data as CandidateInfo }));
              });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const conversations = useMemo(() => {
    const map = new Map<string, { last: ChatMessage; unread: number }>();
    for (const m of messages) {
      const cur = map.get(m.candidate_id);
      const unreadInc = m.sender_role === "candidate" && !m.read_at ? 1 : 0;
      if (!cur) map.set(m.candidate_id, { last: m, unread: unreadInc });
      else map.set(m.candidate_id, { last: m, unread: cur.unread + unreadInc });
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
  }, [messages]);

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  const activeMessages = useMemo(
    () => messages.filter((m) => m.candidate_id === activeId),
    [messages, activeId]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeMessages.length, activeId]);

  // Mark as read when opening a conversation
  useEffect(() => {
    if (!activeId || !user) return;
    const unreadIds = messages
      .filter((m) => m.candidate_id === activeId && m.sender_role === "candidate" && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length) {
      supabase.from("hr_chat_messages").update({ read_at: new Date().toISOString() })
        .in("id", unreadIds).then(() => {
          setMessages((prev) => prev.map((m) => unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m));
        });
    }
  }, [activeId, messages, user]);

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || sending || !user) return;
    setSending(true);
    setInput("");
    const { error } = await supabase.from("hr_chat_messages").insert({
      candidate_id: activeId,
      hr_id: user.id,
      sender_role: "hr",
      content: text,
    });
    if (error) toast.error("Failed to send: " + error.message);
    setSending(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0" aria-label="Candidate chats">
          <MessageCircle className="h-5 w-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
        {!activeId ? (
          <div>
            <div className="p-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">Candidate Chats</p>
              {totalUnread > 0 && <span className="text-xs text-muted-foreground">{totalUnread} unread</span>}
            </div>
            <ScrollArea className="h-[420px]">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : conversations.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">No candidate messages yet.</p>
              ) : (
                conversations.map((c) => {
                  const cand = candidates[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveId(c.id)}
                      className="w-full flex items-start gap-3 p-3 border-b border-border hover:bg-muted/60 text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {cand?.profile_picture ? (
                          <img src={cand.profile_picture} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs font-semibold">
                            {(cand?.full_name || cand?.email || "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{cand?.full_name || cand?.email || "Candidate"}</p>
                          {c.unread > 0 && (
                            <span className="h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                              {c.unread}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.last.sender_role === "hr" ? "You: " : ""}{c.last.content}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="flex flex-col h-[480px]">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setActiveId(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{candidates[activeId]?.full_name || "Candidate"}</p>
                <p className="text-xs text-muted-foreground truncate">{candidates[activeId]?.email}</p>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
              {activeMessages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_role === "hr" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    m.sender_role === "hr"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-background border border-border rounded-bl-md"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border">
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Reply to candidate..." className="flex-1 h-9 text-sm" disabled={sending} />
                <Button type="submit" size="sm" className="h-9 w-9 p-0" disabled={sending || !input.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default HRChatPanel;
