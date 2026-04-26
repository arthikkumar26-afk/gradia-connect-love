import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Globe, Copy, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Domains that MUST be whitelisted in Razorpay → Account & Settings → Website and App Details
const REQUIRED_DOMAINS = [
  "https://gradiaa.com",
  "https://www.gradiaa.com",
  "https://gradia.world",
  "https://www.gradia.world",
  "https://gradia-link-shine.lovable.app",
];

const stripProtocol = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");

export default function RazorpayDomainChecklist() {
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const isPreview = /lovable\.app$/i.test(stripProtocol(currentOrigin).split("/")[0]) &&
    currentOrigin.includes("id-preview--");

  const isWhitelisted = useMemo(() => {
    const host = stripProtocol(currentOrigin);
    return REQUIRED_DOMAINS.some((d) => stripProtocol(d) === host);
  }, [currentOrigin]);

  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Copied", { description: txt });
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Razorpay Domain Whitelist Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current origin status */}
        <div className="rounded-lg border border-border p-3 bg-card">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Current Payment URL
              </p>
              <p className="font-mono text-xs break-all" title={currentOrigin}>
                {currentOrigin || "—"}
              </p>
            </div>
            {isWhitelisted ? (
              <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10 shrink-0">
                <CheckCircle2 className="h-3 w-3" /> Whitelisted
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 shrink-0">
                <XCircle className="h-3 w-3" /> Not in list
              </Badge>
            )}
          </div>

          {!isWhitelisted && (
            <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-[11px] leading-snug flex gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                Payments from this URL will be blocked by Razorpay with{" "}
                <span className="font-semibold">"Payment blocked as website does not match registered website(s)"</span>.
                Add this exact origin to your Razorpay account.
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 mt-1 text-[11px]"
                  onClick={() => copy(currentOrigin)}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy current URL
                </Button>
              </div>
            </div>
          )}

          {isPreview && (
            <p className="text-[11px] text-muted-foreground mt-2">
              ℹ️ You're on a Lovable preview URL. Each preview has its own origin — whitelist it
              separately or test on the published domain.
            </p>
          )}
        </div>

        {/* Required domains checklist */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Required domains (tick each one you've added in Razorpay)
          </p>
          <ul className="space-y-1.5">
            {REQUIRED_DOMAINS.map((d) => {
              const isCurrent = stripProtocol(d) === stripProtocol(currentOrigin);
              return (
                <li
                  key={d}
                  className={`flex items-center gap-2 rounded border border-border p-2 text-xs ${
                    isCurrent ? "bg-primary/5 border-primary/30" : "bg-card"
                  }`}
                >
                  <Checkbox
                    id={`wl-${d}`}
                    checked={!!confirmed[d]}
                    onCheckedChange={(v) =>
                      setConfirmed((prev) => ({ ...prev, [d]: !!v }))
                    }
                  />
                  <label
                    htmlFor={`wl-${d}`}
                    className="font-mono text-[11px] flex-1 cursor-pointer break-all"
                  >
                    {d}
                  </label>
                  {isCurrent && (
                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                      current
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => copy(d)}
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button asChild size="sm" variant="outline" className="gap-1">
            <a
              href="https://dashboard.razorpay.com/app/website-app-details"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Razorpay Website Settings
            </a>
          </Button>
          <p className="text-[11px] text-muted-foreground sm:self-center">
            After adding URLs in Razorpay, approval can take a few hours.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
