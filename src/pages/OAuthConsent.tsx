import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Local wrapper: `supabase.auth.oauth` is a beta namespace that TS types may miss.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthApi = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card rounded-lg shadow-large p-8 text-center">
          <h1 className="text-xl font-semibold mb-2">Authorization error</h1>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const redirectUri = details.client?.redirect_uri ?? details.redirect_uri;
  const scopes: string[] = details.scopes ?? details.requested_scopes ?? [];

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-subtle">
      <div className="max-w-md w-full bg-card rounded-lg shadow-large p-8">
        <h1 className="text-2xl font-semibold mb-2">Connect {clientName} to Gradia</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {clientName} will be able to call Gradia's enabled tools while you are signed in.
        </p>

        {redirectUri && (
          <div className="text-xs text-muted-foreground mb-4">
            Redirect: <span className="font-mono">{redirectUri}</span>
          </div>
        )}

        {scopes.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">Permissions requested:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              {scopes.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground mb-6">
          This does not bypass Gradia's permissions or backend policies. Your account still controls what data is accessible.
        </p>

        <div className="flex gap-3">
          <Button
            className="flex-1"
            disabled={busy}
            onClick={() => decide(true)}
          >
            Approve
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => decide(false)}
          >
            Cancel connection
          </Button>
        </div>
      </div>
    </main>
  );
}
