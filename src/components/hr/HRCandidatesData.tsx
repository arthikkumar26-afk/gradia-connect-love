import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Upload, Loader2, FileText, Trash2, Download, ExternalLink, UserSquare2, Mail, Phone,
  GraduationCap, Briefcase, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { downloadResume, openResume } from "@/utils/resumeUrl";

interface ParsedProfile {
  id: string;
  fileName: string;
  resumeUrl: string;
  uploading: boolean;
  parsing: boolean;
  error?: string;
  // parsed fields
  full_name?: string;
  email?: string;
  mobile?: string;
  highest_qualification?: string;
  experience_level?: string;
  preferred_role?: string;
  experience_summary?: string;
  skills?: string[];
  skill_highlights?: string[];
  education?: Array<{ education_level?: string; school_college_name?: string; board_university?: string; year_of_passing?: string | number }>;
  experience?: Array<{ organization?: string; designation?: string; duration?: string; description?: string }>;
  // kept in-memory only, used to retry parsing without re-uploading
  _file?: File;
}

interface Props {
  hrUserId: string;
  employerUserId: string;
  employerName: string;
}

export default function HRCandidatesData({ hrUserId }: Props) {
  const [profiles, setProfiles] = useState<ParsedProfile[]>([]);
  const [filter, setFilter] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [creditsOut, setCreditsOut] = useState(false);
  const [openProfile, setOpenProfile] = useState<ParsedProfile | null>(null);

  // Deep-parse Supabase FunctionsHttpError to surface the real backend message
  // (e.g. "AI credits exhausted") instead of the generic "non-2xx status code".
  const parseInvokeError = async (
    error?: { message?: string; context?: unknown } | null,
    data?: { error?: string } | null,
  ): Promise<{ raw: string; status?: number }> => {
    let contextMessage = "";
    let status: number | undefined;
    if (error?.context instanceof Response) {
      status = error.context.status;
      try {
        const body = await error.context.clone().json();
        contextMessage = String(body?.error || body?.message || "");
      } catch {
        contextMessage = await error.context.clone().text().catch(() => "");
      }
    } else if (typeof error?.context === "object" && error.context !== null) {
      const ctx = error.context as { error?: string; status?: number };
      contextMessage = String(ctx.error || "");
      status = ctx.status;
    }
    const raw = String(data?.error || contextMessage || error?.message || "Parse failed");
    return { raw, status };
  };

  const uploadOne = async (file: File): Promise<{ url: string; name: string } | null> => {
    const lower = file.name.toLowerCase();
    if (![".pdf", ".doc", ".docx"].some(ext => lower.endsWith(ext))) {
      toast.error(`${file.name}: Only PDF/DOC/DOCX allowed.`);
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name}: Too large (max 10 MB).`);
      return null;
    }
    const ext = file.name.split(".").pop();
    const path = `${hrUserId}/candidates-data/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(`${file.name}: upload failed`);
      return null;
    }
    const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name };
  };

  const parseOne = async (id: string, file: File) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, parsing: true, error: undefined } : p));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data, error } = await supabase.functions.invoke("parse-resume", { body: fd });
      if (error || data?.error) {
        const { raw, status } = await parseInvokeError(error, data);
        const isCredits = status === 402 || /402|credits exhausted|payment_required|Not enough credits/i.test(raw);
        const isBusy = status === 429 || /429|rate.?limit|busy/i.test(raw);
        const friendly = isCredits
          ? "AI credits exhausted. Add balance, then retry."
          : isBusy
            ? "AI is busy. Wait a moment and retry."
            : raw;
        if (isCredits) setCreditsOut(true);
        setProfiles(prev => prev.map(p => p.id === id ? { ...p, parsing: false, error: friendly } : p));
        return;
      }
      // parse-resume returns analysisData fields at the top level of responseBody (per index.ts)
      const a = data || {};
      setProfiles(prev => prev.map(p => p.id === id ? {
        ...p,
        parsing: false,
        full_name: a.full_name || a.name,
        email: a.email,
        mobile: a.mobile || a.phone,
        highest_qualification: a.highest_qualification,
        experience_level: a.experience_level,
        preferred_role: a.preferred_role,
        experience_summary: a.experience_summary,
        skills: Array.isArray(a.skills) ? a.skills : [],
        skill_highlights: Array.isArray(a.skill_highlights) ? a.skill_highlights : [],
        education: Array.isArray(a.education) ? a.education : [],
        experience: Array.isArray(a.experience) ? a.experience : [],
      } : p));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Parse failed";
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, parsing: false, error: msg } : p));
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const placeholders: ParsedProfile[] = arr.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: f.name,
      resumeUrl: "",
      uploading: true,
      parsing: false,
    }));
    setProfiles(prev => [...placeholders, ...prev]);
    setBulkBusy(true);

    // Upload all in parallel
    const uploaded = await Promise.all(arr.map(async (f, i) => {
      const out = await uploadOne(f);
      const id = placeholders[i].id;
      if (!out) {
        setProfiles(prev => prev.map(p => p.id === id ? { ...p, uploading: false, error: "Upload failed" } : p));
        return null;
      }
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, uploading: false, resumeUrl: out.url } : p));
      return { id, file: f };
    }));

    const ok = uploaded.filter(Boolean) as { id: string; file: File }[];
    if (ok.length > 0) {
      toast.success(`${ok.length} resume${ok.length > 1 ? "s" : ""} uploaded. AI parsing now…`);
      // Parse with limited concurrency to avoid rate limits
      const CONCURRENCY = 3;
      let cursor = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, ok.length) }, async () => {
        while (cursor < ok.length) {
          const u = ok[cursor++];
          await parseOne(u.id, u.file);
        }
      });
      await Promise.all(workers);
      toast.success(`Profiles created for ${ok.length} candidate${ok.length > 1 ? "s" : ""}.`);
    }
    setBulkBusy(false);
  };

  const removeProfile = (id: string) => setProfiles(prev => prev.filter(p => p.id !== id));
  const clearAll = () => setProfiles([]);

  const filtered = profiles.filter(p => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      p.fileName.toLowerCase().includes(q) ||
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.preferred_role || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserSquare2 className="h-4 w-4 text-primary" /> Candidates Data — Bulk Resume Profiles
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Upload many resumes at once. AI parses each CV and creates a candidate profile (name, contact, skills, education, experience). The resume stays attached to each profile and can be viewed or downloaded anytime.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Upload resumes (bulk supported)</span>
            <label className="inline-flex items-center justify-center gap-2 text-sm cursor-pointer px-3 py-2 border border-dashed rounded-md hover:bg-muted/50 transition">
              <Upload className="h-4 w-4" /> Click to upload PDF/DOC/DOCX (multi-select)
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,application/pdf"
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              />
            </label>
          </div>

          {bulkBusy && (
            <div className="text-xs text-primary flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing resumes and creating profiles…
            </div>
          )}

          {profiles.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <Input
                placeholder="Filter by name, email, role, file…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 text-xs max-w-xs"
              />
              <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive ml-auto" onClick={clearAll}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground space-y-2">
            <UserSquare2 className="h-8 w-8 mx-auto opacity-40" />
            <p>No profiles yet. Upload resumes to auto-create candidate profiles.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Candidate</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs">Role / Experience</TableHead>
                  <TableHead className="text-xs">Top Skills</TableHead>
                  <TableHead className="text-xs">Resume</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <UserSquare2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[160px]" title={p.full_name || p.fileName}>
                            {p.full_name || (p.parsing ? "Parsing…" : (p.error ? "—" : "Unknown"))}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[160px]" title={p.fileName}>
                            {p.fileName}
                          </p>
                        </div>
                        {(p.uploading || p.parsing) && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{p.email}</span>}
                        {p.mobile && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{p.mobile}</span>}
                        {!p.email && !p.mobile && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        {p.preferred_role && <span className="font-medium">{p.preferred_role}</span>}
                        {p.experience_level && <Badge variant="outline" className="text-[10px] w-fit">{p.experience_level}</Badge>}
                        {!p.preferred_role && !p.experience_level && (
                          p.error ? <span className="text-destructive text-[11px]">{p.error}</span> : <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {(p.skill_highlights?.length ? p.skill_highlights : p.skills || []).slice(0, 4).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                        {!(p.skill_highlights?.length || p.skills?.length) && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.resumeUrl ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => openResume(p.resumeUrl)}>
                            <ExternalLink className="h-3 w-3 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => downloadResume(p.resumeUrl, p.fileName)}>
                            <Download className="h-3 w-3 mr-1" /> Download
                          </Button>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setOpenProfile(p)} disabled={p.uploading || p.parsing}>
                          View Profile
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeProfile(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Profile detail dialog */}
      <Dialog open={!!openProfile} onOpenChange={(o) => !o && setOpenProfile(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {openProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserSquare2 className="h-5 w-5 text-primary" />
                  {openProfile.full_name || openProfile.fileName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                {/* Resume actions */}
                <div className="flex flex-wrap items-center gap-2 p-3 border rounded-md bg-muted/30">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium truncate flex-1" title={openProfile.fileName}>{openProfile.fileName}</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openResume(openProfile.resumeUrl)}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Open Resume
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={() => downloadResume(openProfile.resumeUrl, openProfile.fileName)}>
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                    <p className="text-sm font-medium">{openProfile.email || "—"}</p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Mobile</p>
                    <p className="text-sm font-medium">{openProfile.mobile || "—"}</p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Preferred Role</p>
                    <p className="text-sm font-medium">{openProfile.preferred_role || "—"}</p>
                  </div>
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Experience</p>
                    <p className="text-sm font-medium">{openProfile.experience_level || "—"}</p>
                  </div>
                </div>

                {openProfile.experience_summary && (
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI Summary</p>
                    <p className="text-sm">{openProfile.experience_summary}</p>
                  </div>
                )}

                {/* Skills */}
                {(openProfile.skills?.length || openProfile.skill_highlights?.length) ? (
                  <div className="p-3 border rounded-md">
                    <p className="text-xs text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {(openProfile.skills || []).map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-[11px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Education */}
                {openProfile.education && openProfile.education.length > 0 && (
                  <div className="p-3 border rounded-md space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Education</p>
                    {openProfile.education.map((ed, i) => (
                      <div key={i} className="text-xs border-l-2 border-primary/30 pl-2">
                        <p className="font-medium">{ed.education_level || "—"}</p>
                        <p className="text-muted-foreground">{ed.school_college_name || ed.board_university || ""} {ed.year_of_passing ? `• ${ed.year_of_passing}` : ""}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Experience */}
                {openProfile.experience && openProfile.experience.length > 0 && (
                  <div className="p-3 border rounded-md space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" /> Experience</p>
                    {openProfile.experience.map((ex, i) => (
                      <div key={i} className="text-xs border-l-2 border-primary/30 pl-2">
                        <p className="font-medium">{ex.designation || "—"} {ex.organization ? `@ ${ex.organization}` : ""}</p>
                        {ex.duration && <p className="text-muted-foreground">{ex.duration}</p>}
                        {ex.description && <p className="text-muted-foreground mt-0.5">{ex.description}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {openProfile.error && (
                  <div className="p-3 border border-destructive/40 rounded-md text-xs text-destructive bg-destructive/5">
                    {openProfile.error}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
