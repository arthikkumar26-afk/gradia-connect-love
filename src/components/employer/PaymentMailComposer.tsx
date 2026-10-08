import { useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Loader2, Save, Send, Trash2 } from "lucide-react";
import { paymentEmailTemplates, type PaymentEmailTemplate } from "@/config/paymentEmailTemplates";
import { useToast } from "@/hooks/use-toast";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; candidateId: string; jobId?: string | null; jobTitle?: string | null; amount: number; onSent: () => void }

export default function PaymentMailComposer({ open, onOpenChange, candidateId, jobId, jobTitle, amount, onSent }: Props) {
  const { toast } = useToast();
  const initial = paymentEmailTemplates[0];
  const [templates, setTemplates] = useState<PaymentEmailTemplate[]>([]);
  const [selected, setSelected] = useState(initial?.id || "");
  const [name, setName] = useState(initial?.name || "");
  const [subject, setSubject] = useState(initial?.subject || "");
  const [body, setBody] = useState(initial?.body || "");
  const [tab, setTab] = useState("edit");
  const [preview, setPreview] = useState<{ html: string; subject: string; recipient: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const invoke = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("candidate-payment-request", { body: payload });
    if (error) {
      let message = error.message;
      if (error instanceof FunctionsHttpError) { const details = await error.context.json().catch(() => null); message = typeof details?.error === "string" ? details.error : message; }
      throw new Error(message);
    }
    if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Check the entered details");
    return data;
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    invoke({ action: "templates" }).then((data) => { if (active) setTemplates(data.templates || []); }).catch((error) => toast({ title: "Could not load saved templates", description: error.message, variant: "destructive" }));
    return () => { active = false; };
  }, [open]);
  useEffect(() => { setPreview(null); setTab("edit"); }, [subject, body, amount, candidateId, jobTitle]);

  const choose = (id: string) => {
    const template = [...paymentEmailTemplates, ...templates].find((item) => item.id === id);
    if (!template) return;
    setSelected(id); setName(template.name); setSubject(template.subject); setBody(template.body);
  };
  const showPreview = async () => {
    setBusy("preview");
    try {
      const data = await invoke({ action: "preview", candidateId, jobTitle, amount, mailSubject: subject, mailBody: body });
      setPreview(data); setTab("preview");
    } catch (error) { toast({ title: "Could not preview email", description: (error as Error).message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const save = async (copy: boolean) => {
    setBusy("save");
    try {
      const saved = templates.some((template) => template.id === selected);
      const data = await invoke({ action: "save_template", ...(!copy && saved ? { id: selected } : {}), name, subject, body });
      setTemplates((items) => [...items.filter((item) => item.id !== data.template.id), data.template]); setSelected(data.template.id);
      toast({ title: "Payment template saved" });
    } catch (error) { toast({ title: "Could not save template", description: (error as Error).message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const remove = async () => {
    if (!window.confirm("Delete this saved payment template?")) return;
    setBusy("delete");
    try { await invoke({ action: "delete_template", id: selected }); setTemplates((items) => items.filter((item) => item.id !== selected)); choose(paymentEmailTemplates[0]?.id || ""); }
    catch (error) { toast({ title: "Could not delete template", description: (error as Error).message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const send = async () => {
    if (!preview) return;
    setBusy("send");
    try {
      const data = await invoke({ action: "send", candidateId, jobId: jobId || null, jobTitle: jobTitle || null, amount, mailSubject: subject, mailBody: body });
      toast({ title: data.emailSent ? "Payment mail sent" : "Payment link created, but the email failed to send", variant: data.emailSent ? "default" : "destructive" });
      onSent(); onOpenChange(false);
    } catch (error) { toast({ title: "Could not send payment mail", description: (error as Error).message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const valid = subject.trim().length > 0 && body.trim().length > 0;
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
    <DialogContent className="z-[1700] max-w-4xl w-[calc(100%-24px)] p-4 sm:p-6" aria-describedby={undefined}>
      <DialogHeader><DialogTitle>Payment email · ₹{amount.toLocaleString("en-IN")}</DialogTitle></DialogHeader>
      <div className="space-y-3 min-w-0">
        <Label htmlFor="payment-template">Email template</Label>
        <Select value={selected} onValueChange={choose} disabled={Boolean(busy)}><SelectTrigger id="payment-template"><SelectValue /></SelectTrigger><SelectContent className="z-[1800]">{[...paymentEmailTemplates, ...templates].map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select>
        <Tabs value={tab} onValueChange={(value) => { if (value === "preview") void showPreview(); else setTab(value); }}>
          <TabsList><TabsTrigger value="edit">Edit email</TabsTrigger><TabsTrigger value="preview" disabled={!valid || Boolean(busy)}><Eye className="h-4 w-4 mr-1" />Preview</TabsTrigger></TabsList>
          <TabsContent value="edit" className="space-y-3">
            <div className="space-y-1"><Label htmlFor="payment-template-name">Template name</Label><Input id="payment-template-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={Boolean(busy)} /></div>
            <div className="space-y-1"><Label htmlFor="payment-mail-subject">Subject</Label><Input id="payment-mail-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={250} disabled={Boolean(busy)} /></div>
            <div className="space-y-1"><Label htmlFor="payment-mail-body">Email content</Label><Textarea id="payment-mail-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={15000} className="min-h-[280px] max-h-[40vh] text-sm" disabled={Boolean(busy)} /></div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => save(false)} disabled={!valid || !name.trim() || Boolean(busy)}><Save className="h-4 w-4 mr-1" />Save template</Button>{templates.some((template) => template.id === selected) && <><Button variant="outline" size="sm" onClick={() => save(true)} disabled={!valid || !name.trim() || Boolean(busy)}>Save as new</Button><Button variant="ghost" size="icon" aria-label="Delete template" title="Delete template" onClick={remove} disabled={Boolean(busy)}><Trash2 className="h-4 w-4" /></Button></>}</div>
          </TabsContent>
          <TabsContent value="preview" className="space-y-2">
            {preview && <><div className="text-xs break-words space-y-1"><p><span className="text-muted-foreground">To:</span> {preview.recipient}</p><p><span className="text-muted-foreground">Subject:</span> {preview.subject}</p></div><iframe title="Payment email preview" sandbox="" srcDoc={preview.html} className="w-full h-[45vh] min-h-[260px] border rounded-md bg-background" /></>}
          </TabsContent>
        </Tabs>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t pt-3"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={Boolean(busy)}>Cancel</Button>{tab === "edit" ? <Button onClick={showPreview} disabled={!valid || Boolean(busy)}>{busy === "preview" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}Preview email</Button> : <Button onClick={send} disabled={!preview || Boolean(busy)}>{busy === "send" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}Send Payment Mail</Button>}</div>
    </DialogContent>
  </Dialog>;
}