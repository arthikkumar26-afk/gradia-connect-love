import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Download, Image as ImageIcon, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FlyerManualEditor from "./FlyerManualEditor";

interface Props {
  job_title: string;
  company_name?: string;
  location?: string;
  experience?: string;
  salary?: string;
  skills?: string;
  compact?: boolean;
}

const FlyerGenerator = ({ job_title, company_name, location, experience, salary, skills, compact }: Props) => {
  const [style, setStyle] = useState("modern, bold, gradient accents");
  const [highlights, setHighlights] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const generate = async () => {
    if (!job_title) { toast.error("Job title required"); return; }
    setLoading(true);
    setImgUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-flyer", {
        body: { job_title, company_name, location, experience, salary, skills, highlights, style },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.image_url) throw new Error("No flyer returned");
      setImgUrl(data.image_url as string);
      toast.success("Flyer generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate flyer");
    } finally { setLoading(false); }
  };

  const download = () => {
    if (!imgUrl) return;
    const a = document.createElement("a");
    a.href = imgUrl;
    a.download = `flyer-${job_title.replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const share = async () => {
    if (!imgUrl) return;
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const file = new File([blob], "flyer.png", { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Hiring: ${job_title}`, text: `We're hiring ${job_title}${company_name ? " at " + company_name : ""}` });
      } else {
        download();
      }
    } catch { download(); }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Design style</Label>
          <Input value={style} onChange={e => setStyle(e.target.value)} placeholder="modern / minimal / corporate / festive" className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Highlights (optional)</Label>
          <Input value={highlights} onChange={e => setHighlights(e.target.value)} placeholder="Remote-friendly, immediate joining…" className="h-9 text-sm" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={generate} disabled={loading} size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
          {imgUrl ? "Regenerate Flyer" : "Generate AI Flyer"}
        </Button>
        {imgUrl && (
          <>
            <Button onClick={download} size="sm" variant="outline"><Download className="h-4 w-4 mr-1.5" />Download</Button>
            <Button onClick={share} size="sm" variant="outline"><Share2 className="h-4 w-4 mr-1.5" />Share</Button>
          </>
        )}
      </div>
      <div className="border border-dashed border-border rounded-md bg-muted/30 flex items-center justify-center min-h-[200px] p-3">
        {loading ? (
          <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Designing flyer…</div>
        ) : imgUrl ? (
          <img src={imgUrl} alt={`Hiring flyer for ${job_title}`} className="max-h-[420px] w-auto rounded shadow" />
        ) : (
          <div className="text-xs text-muted-foreground flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Click "Generate AI Flyer" to create a social-media post</div>
        )}
      </div>
      <FlyerManualEditor defaults={{ job_title, company_name, location, experience, salary, skills, highlights }} />
    </div>
  );
};

export default FlyerGenerator;
