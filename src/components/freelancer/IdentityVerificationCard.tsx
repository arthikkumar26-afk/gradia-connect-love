import { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Upload, Loader2, BadgeCheck, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card", pattern: /^\d{12}$/, hint: "12 digits" },
  { value: "pan", label: "PAN Card", pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/i, hint: "ABCDE1234F" },
  { value: "passport", label: "Passport", pattern: /^[A-Z]{1}[0-9]{7}$/i, hint: "A1234567" },
  { value: "voter_id", label: "Voter ID", pattern: /^[A-Z]{3}[0-9]{7}$/i, hint: "ABC1234567" },
  { value: "driving_license", label: "Driving License", pattern: /^[A-Z]{2}[0-9]{2}\s?[0-9]{4}\s?[0-9]{7}$/i, hint: "DL0420220012345" },
];

export const IdentityVerificationCard = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [idType, setIdType] = useState<string>("");
  const [idNumber, setIdNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isVerified = !!profile?.govt_id_verified;

  if (isVerified) {
    return (
      <Card className="border-green-500/40 bg-green-50/40 dark:bg-green-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-5 w-5 text-green-600" />
            Identity Verified
            <Badge className="ml-2 bg-green-600 text-white hover:bg-green-600">✓ Verified</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            Your government ID has been verified. Clients see a verified tick on your profile.
          </p>
          {profile?.govt_id_type && (
            <p>
              <span className="font-medium text-foreground">ID Type:</span>{" "}
              {ID_TYPES.find(t => t.value === profile.govt_id_type)?.label || profile.govt_id_type}
            </p>
          )}
          {profile?.govt_id_url && (
            <a
              href={profile.govt_id_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              <FileText className="h-3 w-3" /> View uploaded document
            </a>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async () => {
    if (!profile?.id) return;
    const selected = ID_TYPES.find(t => t.value === idType);
    if (!selected) {
      toast({ title: "Select an ID type", variant: "destructive" });
      return;
    }
    if (!selected.pattern.test(idNumber.trim())) {
      toast({ title: "Invalid ID number", description: `Expected format: ${selected.hint}`, variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Upload your ID document", description: "Image or PDF up to 5MB", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 5MB", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${profile.id}/${idType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("govt-id-documents")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("govt-id-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      const now = new Date().toISOString();
      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          govt_id_type: idType,
          govt_id_number: idNumber.trim().toUpperCase(),
          govt_id_url: signed?.signedUrl || path,
          govt_id_verified: true,
          govt_id_submitted_at: now,
          govt_id_verified_at: now,
        })
        .eq("id", profile.id);
      if (updErr) throw updErr;

      toast({ title: "Identity Verified ✓", description: "Your profile now shows a verified tick." });
      await refreshProfile();
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const selected = ID_TYPES.find(t => t.value === idType);

  return (
    <Card className="border-amber-500/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          Verify Your Identity
          <Badge variant="outline" className="ml-2 border-amber-500/50 text-amber-700 dark:text-amber-400">
            Not Verified
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Upload any government-issued ID. Verified freelancers get a tick badge on their profile and
          rank higher in client searches.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">ID Type</Label>
            <Select value={idType} onValueChange={setIdType}>
              <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
              <SelectContent>
                {ID_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">ID Number {selected && <span className="text-muted-foreground">({selected.hint})</span>}</Label>
            <Input
              value={idNumber}
              onChange={e => setIdNumber(e.target.value)}
              placeholder={selected?.hint || "Enter ID number"}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Upload Document (Image or PDF, max 5MB)</Label>
          <Input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
          {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" /> Submit for Verification</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default IdentityVerificationCard;
