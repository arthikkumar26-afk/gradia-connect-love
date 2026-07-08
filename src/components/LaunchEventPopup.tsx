import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2, ExternalLink, Upload } from "lucide-react";

interface PopupAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  show_email_input: boolean;
}

const LaunchEventPopup = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [ad, setAd] = useState<PopupAd | null>(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("popup_ad_dismissed");
    if (dismissed) return;

    const fetchAd = async () => {
      const { data } = await supabase
        .from('popup_ads')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        setAd(data[0] as PopupAd);
        setTimeout(() => setOpen(true), 1500);
      }
    };
    fetchAd();
  }, []);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem("popup_ad_dismissed", "true");
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
      toast.success("Details sent to your email!");
      handleClose();
    } catch {
      toast.error("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!ad) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:z-50 [&>button]:bg-white/80 [&>button]:rounded-full [&>button]:p-1">
        <div className="bg-background rounded-lg overflow-hidden">
          <div className="p-4 space-y-3">
            <h3 className="text-lg font-semibold text-center">{ad.title}</h3>
            {ad.description && (
              <p className="text-sm text-muted-foreground text-center">{ad.description}</p>
            )}
            {ad.show_email_input && (
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
            )}
            {ad.link_url && !ad.show_email_input && (
              <div className="flex justify-center">
                <Button asChild>
                  <a href={ad.link_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {ad.link_label || "Learn More"}
                  </a>
                </Button>
              </div>
            )}
          </div>
          {ad.image_url && (
            <img src={ad.image_url} alt={ad.title} className="w-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LaunchEventPopup;
