import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload, Palette } from "lucide-react";
import { toast } from "sonner";

interface Props {
  defaults: {
    job_title?: string;
    company_name?: string;
    location?: string;
    experience?: string;
    salary?: string;
    skills?: string;
    highlights?: string;
  };
}

type TemplateId = "gradient" | "minimal" | "bold";

const TEMPLATES: { id: TemplateId; name: string; bg: string; accent: string; text: string }[] = [
  { id: "gradient", name: "Gradient Pro", bg: "linear-gradient(135deg,#1e1b4b,#9d174d,#f59e0b)", accent: "#f59e0b", text: "#ffffff" },
  { id: "minimal", name: "Clean Minimal", bg: "#ffffff", accent: "#0f172a", text: "#0f172a" },
  { id: "bold", name: "Bold Dark", bg: "linear-gradient(160deg,#0f172a,#1e293b)", accent: "#22d3ee", text: "#ffffff" },
];

const FlyerManualEditor = ({ defaults }: Props) => {
  const [tpl, setTpl] = useState<TemplateId>("gradient");
  const [headline, setHeadline] = useState("WE'RE HIRING");
  const [title, setTitle] = useState(defaults.job_title || "");
  const [company, setCompany] = useState(defaults.company_name || "");
  const [location, setLocation] = useState(defaults.location || "");
  const [experience, setExperience] = useState(defaults.experience || "");
  const [salary, setSalary] = useState(defaults.salary || "");
  const [skills, setSkills] = useState(defaults.skills || "");
  const [cta, setCta] = useState("APPLY NOW");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const t = TEMPLATES.find(x => x.id === tpl)!;

  const onPickFile = (setter: (s: string | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setter(r.result as string);
    r.readAsDataURL(f);
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    if (bgUrl) return; // image drawn separately
    if (t.id === "gradient") {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1e1b4b"); g.addColorStop(0.5, "#9d174d"); g.addColorStop(1, "#f59e0b");
      ctx.fillStyle = g;
    } else if (t.id === "bold") {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#0f172a"); g.addColorStop(1, "#1e293b");
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = "#ffffff";
    }
    ctx.fillRect(0, 0, W, H);
  };

  const wrap = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) => {
    const words = text.split(/\s+/);
    let line = ""; let yy = y;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy); line = w; yy += lh;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy;
  };

  const render = async () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    drawBackground(ctx, W, H);

    if (bgUrl) {
      await new Promise<void>(res => {
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => { ctx.drawImage(img, 0, 0, W, H); ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0,0,W,H); res(); };
        img.onerror = () => res();
        img.src = bgUrl;
      });
    }

    // Headline
    ctx.fillStyle = t.text;
    ctx.textAlign = "center";
    ctx.font = "bold 90px Inter, Arial, sans-serif";
    ctx.fillText(headline.toUpperCase(), W/2, 180);

    // Job title (accent color)
    ctx.fillStyle = t.accent;
    ctx.font = "bold 110px Inter, Arial, sans-serif";
    ctx.fillText(title.toUpperCase(), W/2, 320);

    // Card
    const cardX = 140, cardY = 400, cardW = W - 280, cardH = 380;
    ctx.fillStyle = t.id === "minimal" ? "#f1f5f9" : "rgba(255,255,255,0.95)";
    ctx.beginPath();
    const r = 24;
    ctx.moveTo(cardX+r,cardY);
    ctx.arcTo(cardX+cardW,cardY,cardX+cardW,cardY+cardH,r);
    ctx.arcTo(cardX+cardW,cardY+cardH,cardX,cardY+cardH,r);
    ctx.arcTo(cardX,cardY+cardH,cardX,cardY,r);
    ctx.arcTo(cardX,cardY,cardX+cardW,cardY,r);
    ctx.closePath(); ctx.fill();

    // Logo
    let textTop = cardY + 70;
    if (logoUrl) {
      await new Promise<void>(res => {
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => { const lh = 90; const lw = img.width * (lh / img.height); ctx.drawImage(img, W/2 - lw/2, cardY + 30, lw, lh); res(); };
        img.onerror = () => res();
        img.src = logoUrl;
      });
      textTop = cardY + 150;
    }

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 42px Inter, Arial, sans-serif";
    if (company) { ctx.fillText(company, W/2, textTop); textTop += 55; }
    ctx.font = "500 28px Inter, Arial, sans-serif";
    if (location) { ctx.fillText(`Location: ${location}`, W/2, textTop); textTop += 38; }
    if (experience) { ctx.fillText(`Experience: ${experience}`, W/2, textTop); textTop += 38; }
    if (salary) { ctx.fillText(`Salary: ${salary}`, W/2, textTop); textTop += 38; }

    // Skills
    if (skills) {
      ctx.fillStyle = t.text;
      ctx.font = "bold 36px Inter, Arial, sans-serif";
      ctx.fillText("KEY SKILLS", W/2, 830);
      ctx.font = "500 26px Inter, Arial, sans-serif";
      wrap(ctx, skills, W/2, 870, W - 200, 36);
    }

    // CTA
    const ctaY = 980;
    ctx.fillStyle = t.accent;
    const ctaW = 360, ctaH = 80;
    ctx.beginPath();
    ctx.roundRect(W/2 - ctaW/2, ctaY - ctaH/2, ctaW, ctaH, 40);
    ctx.fill();
    ctx.fillStyle = t.id === "minimal" ? "#ffffff" : "#0f172a";
    ctx.font = "bold 36px Inter, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(cta.toUpperCase(), W/2, ctaY);
    ctx.textBaseline = "alphabetic";
  };

  useEffect(() => { render(); /* eslint-disable-next-line */ }, [tpl, headline, title, company, location, experience, salary, skills, cta, logoUrl, bgUrl]);

  const download = () => {
    const c = canvasRef.current; if (!c) return;
    c.toBlob((b) => {
      if (!b) { toast.error("Export failed"); return; }
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url; a.download = `flyer-${(title || "job").replace(/\s+/g,"-").toLowerCase()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="space-y-3 border border-border rounded-md p-3 bg-background">
      <div className="flex items-center gap-2 flex-wrap">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Manual Editor</span>
        <div className="flex gap-1 ml-auto">
          {TEMPLATES.map(x => (
            <button key={x.id} onClick={() => setTpl(x.id)}
              className={`text-xs px-2.5 py-1 rounded border ${tpl===x.id ? "border-primary bg-primary/10" : "border-border"}`}>
              {x.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <div><Label className="text-xs">Headline</Label><Input value={headline} onChange={e=>setHeadline(e.target.value)} className="h-9 text-sm" /></div>
          <div><Label className="text-xs">Job Title</Label><Input value={title} onChange={e=>setTitle(e.target.value)} className="h-9 text-sm" /></div>
          <div><Label className="text-xs">Company</Label><Input value={company} onChange={e=>setCompany(e.target.value)} className="h-9 text-sm" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Location</Label><Input value={location} onChange={e=>setLocation(e.target.value)} className="h-9 text-sm" /></div>
            <div><Label className="text-xs">Experience</Label><Input value={experience} onChange={e=>setExperience(e.target.value)} className="h-9 text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Salary</Label><Input value={salary} onChange={e=>setSalary(e.target.value)} className="h-9 text-sm" /></div>
            <div><Label className="text-xs">CTA</Label><Input value={cta} onChange={e=>setCta(e.target.value)} className="h-9 text-sm" /></div>
          </div>
          <div><Label className="text-xs">Key Skills</Label><Textarea value={skills} onChange={e=>setSkills(e.target.value)} rows={2} className="text-sm" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Logo</Label>
              <Input type="file" accept="image/*" onChange={onPickFile(setLogoUrl)} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Background</Label>
              <Input type="file" accept="image/*" onChange={onPickFile(setBgUrl)} className="h-9 text-xs" />
            </div>
          </div>
          <Button onClick={download} size="sm" className="w-full"><Download className="h-4 w-4 mr-1.5" />Download Flyer</Button>
        </div>
        <div className="bg-muted/30 rounded p-2 flex items-center justify-center">
          <canvas ref={canvasRef} className="max-w-full h-auto rounded shadow border border-border" style={{ aspectRatio: "1/1", width: "100%" }} />
        </div>
      </div>
    </div>
  );
};

export default FlyerManualEditor;
