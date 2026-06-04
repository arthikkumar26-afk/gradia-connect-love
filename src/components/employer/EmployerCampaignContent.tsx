import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Send, Mail, Users, Megaphone,
  Paperclip, Loader2, XCircle, RefreshCw, FileEdit, Trash2,
} from "lucide-react";

interface AttachmentFile {
  file?: File;
  name: string;
  size: number;
  type: string;
  uploading?: boolean;
  url?: string;
}

interface CampaignDraft {
  id: string;
  campaignName: string;
  subject: string;
  messageBody: string;
  emailList: string[];
  attachments: AttachmentFile[];
  savedAt: string;
  status?: "draft" | "sending" | "sent" | "failed" | "partial";
  sendResults?: { totalSent: number; totalFailed: number };
}

const DRAFT_STORAGE_KEY = "employer_campaign_drafts";

const loadDrafts = (userId: string): CampaignDraft[] => {
  try {
    const raw = localStorage.getItem(`${DRAFT_STORAGE_KEY}_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveDraftsToStorage = (userId: string, drafts: CampaignDraft[]) => {
  try { localStorage.setItem(`${DRAFT_STORAGE_KEY}_${userId}`, JSON.stringify(drafts)); } catch {}
};

export function EmployerCampaignContent() {
  const [selectedCampaignName, setSelectedCampaignName] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"all" | "delivered" | "failed">("all");
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<{ totalSent: number; totalFailed: number } | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [campaignHistory, setCampaignHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<CampaignDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const sentSuccessfullyRef = useRef(false);

  const fetchCampaignHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase.from("campaign_emails").select("*").order("sent_at", { ascending: false });
    if (!error && data) setCampaignHistory(data);
    setLoadingHistory(false);
  };

  useEffect(() => {
    fetchCampaignHistory();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setDrafts(loadDrafts(user.id));
      }
    })();
  }, []);

  const persistDrafts = (next: CampaignDraft[]) => {
    setDrafts(next);
    if (userId) saveDraftsToStorage(userId, next);
  };

  const groupedCampaigns = campaignHistory.reduce((acc: Record<string, any[]>, row) => {
    const key = row.campaign_name || "Untitled";
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const campaignSummaries = Object.entries(groupedCampaigns).map(([name, emails]: [string, any[]]) => ({
    name,
    type: "Email",
    sent: emails.length,
    delivered: emails.filter(e => e.status === "delivered").length,
    failed: emails.filter(e => e.status === "failed").length,
    status: emails.some(e => e.status === "failed") ? "Partial" : "Completed",
    lastSent: emails[0]?.sent_at,
    emails,
  }));

  const addEmails = () => {
    const newEmails = emailInput
      .split(/[,;\n\s]+/)
      .map(e => e.trim())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !emailList.includes(e));
    if (newEmails.length > 0) {
      setEmailList(prev => [...prev, ...newEmails]);
      setEmailInput("");
    } else if (emailInput.trim()) {
      toast.error("No valid new email addresses found");
    }
  };

  const removeEmail = (email: string) => setEmailList(prev => prev.filter(e => e !== email));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addEmails(); }
  };

  const loadAllCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "candidate")
        .not("email", "is", null);
      if (error) throw error;
      if (data && data.length > 0) {
        const candidateEmails = data
          .map((p: any) => p.email?.trim())
          .filter((e: string) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
        const unique = [...new Set([...emailList, ...candidateEmails])];
        setEmailList(unique);
        toast.success(`${candidateEmails.length} candidate emails loaded`);
      } else {
        toast.info("No registered candidates found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load candidate emails");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxSize = 100 * 1024 * 1024;

    setIsUploading(true);
    const newAttachments: AttachmentFile[] = [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be signed in to upload attachments');
      setIsUploading(false);
      return;
    }

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) { toast.error(`Unsupported file type: ${file.name}`); continue; }
      if (file.size > maxSize) { toast.error(`File too large (max 100MB): ${file.name}`); continue; }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${Date.now()}-${safeName}`;
      const { data, error } = await supabase.storage.from('campaign-attachments').upload(filePath, file);
      if (error) { console.error('Upload error:', error); toast.error(`Upload failed: ${file.name} — ${error.message}`); continue; }

      const { data: urlData } = supabase.storage.from('campaign-attachments').getPublicUrl(data.path);
      newAttachments.push({ file, name: file.name, size: file.size, type: file.type, url: urlData.publicUrl });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (newAttachments.length > 0) toast.success(`${newAttachments.length} file(s) attached`);
  };

  const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.includes('pdf')) return '📄';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const COST_PER_EMAIL = 50;

  const upsertDraft = (patch: Partial<CampaignDraft>, idOverride?: string): string => {
    const id = idOverride || activeDraftId || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const existing = drafts.find(d => d.id === id);
    const draft: CampaignDraft = {
      id,
      campaignName,
      subject,
      messageBody,
      emailList,
      attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type, url: a.url })),
      savedAt: new Date().toISOString(),
      status: "draft",
      ...existing,
      ...patch,
    };
    const others = drafts.filter(d => d.id !== id);
    persistDrafts([draft, ...others]);
    return id;
  };

  const handleSendCampaign = async () => {
    if (emailList.length === 0) { toast.error("Add at least one recipient email"); return; }
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!messageBody.trim()) { toast.error("Message body is required"); return; }

    setIsSending(true);
    setSendResults(null);

    // Ensure a draft tracks this send so the UI shows status
    const draftId = upsertDraft({ status: "sending", savedAt: new Date().toISOString() });
    setActiveDraftId(draftId);

    try {
      const totalCost = emailList.length * COST_PER_EMAIL;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in again"); setIsSending(false); upsertDraft({ status: "failed" }, draftId); return; }

      const { data: wallet, error: wErr } = await supabase
        .from("wallets")
        .select("id, points_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (wErr) throw wErr;
      if (!wallet) { toast.error("Wallet not found. Please load points first."); setIsSending(false); upsertDraft({ status: "failed" }, draftId); return; }

      const balance = wallet.points_balance ?? 0;
      if (balance < totalCost) {
        toast.error(`Insufficient points. Need ${totalCost} pts (${COST_PER_EMAIL} × ${emailList.length}), have ${balance} pts.`);
        setIsSending(false);
        upsertDraft({ status: "failed" }, draftId);
        return;
      }

      const { error: updErr } = await supabase
        .from("wallets")
        .update({ points_balance: balance - totalCost })
        .eq("id", wallet.id);
      if (updErr) throw updErr;

      const campaignLabel = campaignName.trim() || "Untitled Campaign";
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "debit",
        category: "campaign_email_send",
        amount: 0,
        points: totalCost,
        description: `Campaign "${campaignLabel}" sent to ${emailList.length} recipient(s) @ ${COST_PER_EMAIL} pts each`,
      });

      toast.success(`${totalCost} pts deducted for ${emailList.length} email(s)`);

      const htmlBody = messageBody
        .split("\n")
        .map(line => line.trim() ? `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">${line}</p>` : `<br/>`)
        .join("");

      const attachmentPayload = attachments
        .filter(a => a.url)
        .map(a => ({ name: a.name, url: a.url!, type: a.type, size: a.size }));

      const { data, error } = await supabase.functions.invoke("send-campaign-emails", {
        body: {
          recipients: emailList,
          subject: subject.trim(),
          htmlBody,
          senderName: campaignName.trim() || "Gradia Employer",
          campaignName: campaignName.trim() || "Untitled Campaign",
          attachments: attachmentPayload.length > 0 ? attachmentPayload : undefined,
        },
      });

      if (error) throw error;

      setSendResults({ totalSent: data.totalSent, totalFailed: data.totalFailed });
      if (data.totalSent > 0) {
        toast.success(`Campaign sent! ${data.totalSent} email(s) delivered successfully.`);
        sentSuccessfullyRef.current = true;
      }
      if (data.totalFailed > 0) toast.error(`${data.totalFailed} email(s) failed to send.`);

      // Update draft based on outcome: remove if fully successful, otherwise keep with status
      if (data.totalFailed === 0 && data.totalSent > 0) {
        persistDrafts(drafts.filter(d => d.id !== draftId).filter(d => true));
        // ensure removal against latest list
        setDrafts(prev => {
          const next = prev.filter(d => d.id !== draftId);
          if (userId) saveDraftsToStorage(userId, next);
          return next;
        });
      } else {
        upsertDraft({
          status: data.totalSent > 0 ? "partial" : "failed",
          sendResults: { totalSent: data.totalSent, totalFailed: data.totalFailed },
        }, draftId);
      }
    } catch (err: any) {
      console.error("Campaign send error:", err);
      toast.error(err.message || "Failed to send campaign");
      upsertDraft({ status: "failed" }, draftId);
    } finally {
      setIsSending(false);
    }
  };

  const hasUnsavedContent = () =>
    campaignName.trim() || subject.trim() || messageBody.trim() ||
    emailList.length > 0 || attachments.length > 0;

  const saveAsDraft = () => {
    if (!userId) return;
    const draft: CampaignDraft = {
      id: activeDraftId || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      campaignName,
      subject,
      messageBody,
      emailList,
      attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type, url: a.url })),
      savedAt: new Date().toISOString(),
    };
    const others = drafts.filter(d => d.id !== draft.id);
    persistDrafts([draft, ...others]);
    toast.success("Saved to drafts");
  };

  const openDraft = (d: CampaignDraft) => {
    setCampaignName(d.campaignName);
    setSubject(d.subject);
    setMessageBody(d.messageBody);
    setEmailList(d.emailList || []);
    setAttachments(d.attachments || []);
    setActiveDraftId(d.id);
    setSendResults(null);
    sentSuccessfullyRef.current = false;
    setShowNewCampaign(true);
  };

  const deleteDraft = (id: string) => {
    persistDrafts(drafts.filter(d => d.id !== id));
    toast.success("Draft deleted");
  };

  const handleDialogClose = () => {
    // Don't autosave while sending or after success; otherwise keep work as draft
    if (!isSending && !sentSuccessfullyRef.current && hasUnsavedContent() && userId) {
      saveAsDraft();
    }
    resetForm();
  };

  const resetForm = () => {
    setEmailInput(""); setEmailList([]); setSubject(""); setMessageBody("");
    setCampaignName(""); setSendResults(null); setAttachments([]);
    setActiveDraftId(null);
    sentSuccessfullyRef.current = false;
    setShowNewCampaign(false);
    fetchCampaignHistory();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Email Campaigns</h3>
        <Button size="sm" onClick={() => { setActiveDraftId(null); sentSuccessfullyRef.current = false; setShowNewCampaign(true); }}><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
      </div>

      {drafts.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileEdit className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">Drafts ({drafts.length})</h4>
            </div>
            <div className="space-y-1.5">
              {drafts.map(d => (
                <div key={d.id} className="flex items-center gap-2 p-2 rounded-md border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <FileEdit className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {d.campaignName || d.subject || "Untitled draft"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {d.emailList.length} recipient(s) • saved {new Date(d.savedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDraft(d)}>Resume</Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteDraft(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : campaignSummaries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No campaigns sent yet. Click "New Campaign" to get started.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Campaign</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Delivered</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Failed</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignSummaries.map((c, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="p-3 font-medium text-primary hover:underline cursor-pointer" onClick={() => { setSelectedCampaignName(c.name); setDetailTab("all"); }}>{c.name}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{c.type}</Badge></td>
                      <td className="p-3 text-muted-foreground">{c.sent.toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground">{c.delivered.toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground">{c.failed}</td>
                      <td className="p-3">
                        <Badge variant={c.status === "Completed" ? "secondary" : "outline"} className="text-xs">{c.status}</Badge>
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            const emails = c.emails.map((em: any) => em.recipient_email).filter(Boolean);
                            setCampaignName(c.name);
                            setSubject(c.emails[0]?.subject || "");
                            setEmailList([...new Set(emails)]);
                            setShowNewCampaign(true);
                          }}
                        >
                          <RefreshCw className="h-3 w-3" /> Resend
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Detail Dialog */}
      {(() => {
        const selectedCampaign = campaignSummaries.find(c => c.name === selectedCampaignName);
        return (
          <Dialog open={!!selectedCampaignName} onOpenChange={(open) => { if (!open) setSelectedCampaignName(null); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  {selectedCampaign?.name}
                  <Badge variant={selectedCampaign?.status === "Completed" ? "secondary" : "outline"} className="text-xs ml-2">
                    {selectedCampaign?.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold text-foreground">{selectedCampaign?.sent}</p>
                  <p className="text-xs text-muted-foreground">Total Emails</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold text-foreground">{selectedCampaign?.delivered}</p>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-lg font-bold text-foreground">{selectedCampaign?.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              <div className="flex gap-1 mt-3 border-b border-border">
                {(["all", "delivered", "failed"] as const).map(tab => {
                  const count = selectedCampaign?.emails.filter((e: any) =>
                    tab === "all" ? true : e.status === tab
                  ).length || 0;
                  return (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                        detailTab === tab
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 space-y-2">
                {selectedCampaign?.emails
                  .filter((e: any) => detailTab === "all" ? true : e.status === detailTab)
                  .map((email: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{email.recipient_email}</p>
                        <p className="text-xs text-muted-foreground truncate">{email.subject}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            email.status === "delivered" ? "border-green-500/50 text-green-600" :
                            "border-destructive/50 text-destructive"
                          }`}
                        >
                          {email.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {email.sent_at ? new Date(email.sent_at).toLocaleString() : "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                {(selectedCampaign?.emails.filter((e: any) => detailTab === "all" ? true : e.status === detailTab).length || 0) === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No {detailTab} emails in this campaign
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaign} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> New Email Campaign
              {activeDraftId && <Badge variant="outline" className="text-xs ml-2">Draft</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Campaign / Sender Name</Label>
              <Input placeholder="e.g. Company Hiring Drive, Job Fair Invite" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
              <p className="text-xs text-muted-foreground">This name appears as the sender in recipient's inbox</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Recipients <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter emails (comma, space, or newline separated)"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={addEmails}>Add</Button>
              </div>
              <Button size="sm" variant="secondary" className="w-full" onClick={loadAllCandidates}>
                <Users className="h-4 w-4 mr-2" /> Load All Registered Candidates
              </Button>
              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto p-2 rounded-md border border-border bg-muted/30">
                  {emailList.map((email) => (
                    <Badge key={email} variant="secondary" className="text-xs gap-1 pr-1">
                      <Mail className="h-3 w-3" />
                      {email}
                      <button onClick={() => removeEmail(email)} className="ml-0.5 hover:text-destructive">
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{emailList.length} recipient(s) added • Emails sent individually to each</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Subject <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Exciting Job Opportunity at Our Company!" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Message <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Type your email message here...&#10;&#10;Use line breaks for paragraphs. The message will be formatted in a professional email template automatically."
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                rows={8}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">Your message will be wrapped in a branded email template with header & footer</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Attachments</Label>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full border-dashed border-2">
                {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Paperclip className="h-4 w-4 mr-2" /> Add Images, Videos, or PDFs</>}
              </Button>
              {attachments.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30 text-sm">
                      <span>{getFileIcon(att.type)}</span>
                      <span className="flex-1 truncate text-foreground">{att.name}</span>
                      <span className="text-muted-foreground text-xs">{formatFileSize(att.size)}</span>
                      <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-destructive">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">{attachments.length} file(s) attached • Max 100MB each</p>
                </div>
              )}
            </div>

            {sendResults && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-foreground font-medium">{sendResults.totalSent} Sent</span>
                    </div>
                    {sendResults.totalFailed > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-destructive" />
                        <span className="text-foreground font-medium">{sendResults.totalFailed} Failed</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSendCampaign} disabled={isSending || emailList.length === 0} className="flex-1">
                {isSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending {emailList.length} email(s)...</> : <><Send className="h-4 w-4 mr-2" /> Send Campaign ({emailList.length}) • {emailList.length * COST_PER_EMAIL} pts</>}
              </Button>
              <Button variant="outline" onClick={() => { saveAsDraft(); resetForm(); }} disabled={isSending || !hasUnsavedContent()}>
                <FileEdit className="h-4 w-4 mr-1" /> Save Draft
              </Button>
              <Button variant="ghost" onClick={handleDialogClose} disabled={isSending}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
