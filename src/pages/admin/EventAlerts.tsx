import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bell, Send, Loader2, Calendar, Users, Mail, Megaphone, Plus, MapPin, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JobMela {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  city: string;
  state: string;
  expected_attendees: number;
  spots_available: number;
  status: string;
  description: string | null;
  is_active: boolean;
}

const EventAlerts = () => {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [launchPopupEnabled, setLaunchPopupEnabled] = useState(true);
  const [bulkEmail, setBulkEmail] = useState("");
  const [singleEmail, setSingleEmail] = useState("");

  // Job Mela state
  const [melas, setMelas] = useState<JobMela[]>([]);
  const [loadingMelas, setLoadingMelas] = useState(true);
  const [showMelaForm, setShowMelaForm] = useState(false);
  const [savingMela, setSavingMela] = useState(false);
  const [melaForm, setMelaForm] = useState({
    title: "",
    event_date: "",
    event_time: "",
    location: "",
    city: "",
    state: "",
    expected_attendees: 0,
    spots_available: 10,
    status: "upcoming",
    description: "",
  });

  useEffect(() => {
    fetchMelas();
  }, []);

  const fetchMelas = async () => {
    setLoadingMelas(true);
    const { data, error } = await supabase
      .from("job_melas")
      .select("*")
      .order("event_date", { ascending: true });
    if (!error && data) setMelas(data as unknown as JobMela[]);
    setLoadingMelas(false);
  };

  const handleCreateMela = async () => {
    if (!melaForm.title || !melaForm.event_date || !melaForm.location || !melaForm.city || !melaForm.state) {
      toast.error("Please fill all required fields");
      return;
    }
    setSavingMela(true);
    const { error } = await supabase.from("job_melas").insert({
      title: melaForm.title,
      event_date: melaForm.event_date,
      event_time: melaForm.event_time || "9:00 AM - 5:00 PM",
      location: melaForm.location,
      city: melaForm.city,
      state: melaForm.state,
      expected_attendees: melaForm.expected_attendees,
      spots_available: melaForm.spots_available,
      status: melaForm.status,
      description: melaForm.description || null,
    } as any);
    if (error) {
      toast.error("Failed to create Job Mela");
    } else {
      toast.success("Job Mela created! It will now appear on EduTech dashboards.");
      setShowMelaForm(false);
      setMelaForm({ title: "", event_date: "", event_time: "", location: "", city: "", state: "", expected_attendees: 0, spots_available: 10, status: "upcoming", description: "" });
      fetchMelas();
    }
    setSavingMela(false);
  };

  const handleDeleteMela = async (id: string) => {
    const { error } = await supabase.from("job_melas").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Job Mela deleted");
      fetchMelas();
    }
  };

  const handleToggleMela = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("job_melas").update({ is_active: !currentActive } as any).eq("id", id);
    if (!error) {
      toast.success(currentActive ? "Job Mela hidden" : "Job Mela visible");
      fetchMelas();
    }
  };

  const handleSendSingle = async () => {
    if (!singleEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(singleEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-event-invitation", { body: { email: singleEmail } });
      if (error) throw error;
      toast.success(`Event invitation sent to ${singleEmail}`);
      setSingleEmail("");
    } catch {
      toast.error("Failed to send invitation.");
    } finally {
      setSending(false);
    }
  };

  const handleSendBulk = async () => {
    const emails = bulkEmail.split(/[\n,;]+/).map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (emails.length === 0) { toast.error("No valid emails found"); return; }
    setSending(true);
    let s = 0, f = 0;
    for (const email of emails) {
      try {
        const { error } = await supabase.functions.invoke("send-event-invitation", { body: { email } });
        if (error) throw error;
        s++;
      } catch { f++; }
    }
    toast.success(`Sent ${s} invitations${f > 0 ? `, ${f} failed` : ""}`);
    setBulkEmail("");
    setSending(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-primary/10 text-primary";
      case "filling-fast": return "bg-warning/10 text-warning";
      case "sold-out": return "bg-destructive/10 text-destructive";
      case "completed": return "bg-muted text-muted-foreground";
      default: return "bg-primary/10 text-primary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Alerts & Job Mela</h1>
          <p className="text-muted-foreground">Manage events, job melas, and invitations</p>
        </div>
      </div>

      {/* Job Mela Management */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Job Mela Management
              </CardTitle>
              <CardDescription>Create and manage Job Mela events visible to EduTech platforms</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowMelaForm(!showMelaForm)}>
              <Plus className="h-4 w-4 mr-1" /> Create Job Mela
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Creation Form */}
          {showMelaForm && (
            <Card className="border border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold text-foreground">New Job Mela</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input placeholder="e.g. Hyderabad Tech Job Mela 2026" value={melaForm.title} onChange={(e) => setMelaForm({ ...melaForm, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Date *</Label>
                    <Input type="date" value={melaForm.event_date} onChange={(e) => setMelaForm({ ...melaForm, event_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input placeholder="9:00 AM - 5:00 PM" value={melaForm.event_time} onChange={(e) => setMelaForm({ ...melaForm, event_time: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Venue / Location *</Label>
                    <Input placeholder="HICC Convention Center" value={melaForm.location} onChange={(e) => setMelaForm({ ...melaForm, location: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input placeholder="Hyderabad" value={melaForm.city} onChange={(e) => setMelaForm({ ...melaForm, city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Input placeholder="Telangana" value={melaForm.state} onChange={(e) => setMelaForm({ ...melaForm, state: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Attendees</Label>
                    <Input type="number" value={melaForm.expected_attendees} onChange={(e) => setMelaForm({ ...melaForm, expected_attendees: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stall Spots Available</Label>
                    <Input type="number" value={melaForm.spots_available} onChange={(e) => setMelaForm({ ...melaForm, spots_available: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={melaForm.status} onValueChange={(v) => setMelaForm({ ...melaForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                        <SelectItem value="filling-fast">Filling Fast</SelectItem>
                        <SelectItem value="sold-out">Sold Out</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Additional details about the event..." value={melaForm.description} onChange={(e) => setMelaForm({ ...melaForm, description: e.target.value })} rows={2} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowMelaForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleCreateMela} disabled={savingMela}>
                    {savingMela ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Melas */}
          {loadingMelas ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : melas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No Job Melas created yet. Click "Create Job Mela" to get started.</p>
          ) : (
            <div className="space-y-3">
              {melas.map((mela) => (
                <div key={mela.id} className={`flex items-center justify-between p-4 rounded-lg border ${mela.is_active ? 'border-border' : 'border-border/50 opacity-60'}`}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-foreground text-sm">{mela.title}</h4>
                        <Badge variant="secondary" className={`text-[10px] ${getStatusColor(mela.status)}`}>
                          {mela.status.replace("-", " ")}
                        </Badge>
                        {!mela.is_active && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(mela.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{mela.city}, {mela.state}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{mela.expected_attendees} attendees</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={mela.is_active} onCheckedChange={() => handleToggleMela(mela.id, mela.is_active)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteMela(mela.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Calendar className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Next Event</p>
              <p className="font-semibold text-foreground">Launch Event - 03 Mar</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Event Format</p>
              <p className="font-semibold text-foreground">Online (Zoom)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Megaphone className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Popup Status</p>
              <Badge variant={launchPopupEnabled ? "default" : "secondary"}>{launchPopupEnabled ? "Active" : "Disabled"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Launch Event Popup</CardTitle>
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

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Send Invitation</CardTitle>
            <CardDescription>Send event invitation to a specific email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="flex gap-2">
                <Input type="email" placeholder="Enter email address" value={singleEmail} onChange={(e) => setSingleEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendSingle()} />
                <Button onClick={handleSendSingle} disabled={sending} className="shrink-0">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Bulk Invitations</CardTitle>
          <CardDescription>Send event invitations to multiple people at once</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email Addresses (one per line, or comma/semicolon separated)</Label>
            <Textarea placeholder={"user1@example.com\nuser2@example.com\nuser3@example.com"} value={bulkEmail} onChange={(e) => setBulkEmail(e.target.value)} rows={6} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {bulkEmail.split(/[\n,;]+/).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())).length} valid email(s) detected
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
