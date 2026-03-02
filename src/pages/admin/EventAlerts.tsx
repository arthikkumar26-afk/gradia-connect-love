import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bell, Send, Loader2, Calendar, Users, Mail, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EventAlerts = () => {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [launchPopupEnabled, setLaunchPopupEnabled] = useState(true);
  const [bulkEmail, setBulkEmail] = useState("");
  const [customSubject, setCustomSubject] = useState("🎉 You're Invited! Gradia Launch Event");
  const [customMessage, setCustomMessage] = useState("");
  const [singleEmail, setSingleEmail] = useState("");

  const handleSendSingle = async () => {
    if (!singleEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(singleEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-event-invitation", {
        body: { email: singleEmail },
      });
      if (error) throw error;
      toast.success(`Event invitation sent to ${singleEmail}`);
      setSingleEmail("");
    } catch {
      toast.error("Failed to send invitation. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleSendBulk = async () => {
    const emails = bulkEmail
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emails.length === 0) {
      toast.error("No valid email addresses found");
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const email of emails) {
      try {
        const { error } = await supabase.functions.invoke("send-event-invitation", {
          body: { email },
        });
        if (error) throw error;
        successCount++;
      } catch {
        failCount++;
      }
    }

    toast.success(`Sent ${successCount} invitations${failCount > 0 ? `, ${failCount} failed` : ""}`);
    setBulkEmail("");
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Alerts</h1>
          <p className="text-muted-foreground">Manage event invitations and notifications</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next Event</p>
              <p className="font-semibold text-foreground">Launch Event - 03 Mar</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Event Format</p>
              <p className="font-semibold text-foreground">Online (Zoom)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Popup Status</p>
              <Badge variant={launchPopupEnabled ? "default" : "secondary"}>
                {launchPopupEnabled ? "Active" : "Disabled"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Launch Event Popup Toggle */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" /> Launch Event Popup
            </CardTitle>
            <CardDescription>Control the event popup shown to website visitors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-foreground">Show popup to visitors</p>
                <p className="text-sm text-muted-foreground">Displays the launch event popup on the homepage</p>
              </div>
              <Switch checked={launchPopupEnabled} onCheckedChange={setLaunchPopupEnabled} />
            </div>
            <div className="p-4 rounded-lg border border-border">
              <p className="text-sm font-medium text-foreground mb-1">Event Details</p>
              <p className="text-sm text-muted-foreground">Gradia Launch Event</p>
              <p className="text-sm text-muted-foreground">📅 Tuesday, 03-03-2026 | 🕗 8:00 PM – 9:00 PM</p>
              <p className="text-sm text-muted-foreground">📍 Online via Zoom</p>
            </div>
          </CardContent>
        </Card>

        {/* Send Single Invitation */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" /> Send Invitation
            </CardTitle>
            <CardDescription>Send event invitation to a specific email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendSingle()}
                />
                <Button onClick={handleSendSingle} disabled={sending} className="shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Send */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Bulk Invitations
          </CardTitle>
          <CardDescription>Send event invitations to multiple people at once</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Addresses (one per line, or comma/semicolon separated)</Label>
            <Textarea
              placeholder={"user1@example.com\nuser2@example.com\nuser3@example.com"}
              value={bulkEmail}
              onChange={(e) => setBulkEmail(e.target.value)}
              rows={6}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {bulkEmail
                .split(/[\n,;]+/)
                .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())).length}{" "}
              valid email(s) detected
            </p>
            <Button onClick={handleSendBulk} disabled={sending || !bulkEmail.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send All Invitations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventAlerts;
