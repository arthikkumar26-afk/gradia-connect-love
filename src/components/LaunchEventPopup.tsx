import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2 } from "lucide-react";

const LaunchEventPopup = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("launch_event_dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem("launch_event_dismissed", "true");
  };

  const handleSendEmail = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-event-invitation", {
        body: { email },
      });
      if (error) throw error;
      toast.success("Zoom meeting link sent to your email!");
      handleClose();
    } catch {
      toast.error("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:z-50 [&>button]:bg-white/80 [&>button]:rounded-full [&>button]:p-1">
        <div className="bg-background rounded-lg overflow-hidden">
          <img
            src="/images/launch-event.png"
            alt="Gradia Launch Event - Tuesday 03-03-2026, 8PM-9PM Online"
            className="w-full rounded-t-lg"
          />
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Enter your email to get the Zoom meeting link
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendEmail()}
              />
              <Button onClick={handleSendEmail} disabled={sending} className="shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                {sending ? "" : "Join"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LaunchEventPopup;
