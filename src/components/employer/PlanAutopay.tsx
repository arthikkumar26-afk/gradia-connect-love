import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  subscription: { id: string; amount: number; currency: string; billing_cycle: string; plan_name: string; ends_at: string | null } | null;
  walletPoints: number;
  onChange: () => Promise<void>;
}
export function PlanAutopay({ subscription, walletPoints, onChange }: Props) {
  const [autopay, setAutopay] = useState<{ enabled: boolean; status: string; points_per_renewal: number; last_renewed_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const busy = useRef(false);
  const eligible = !!subscription && subscription.currency === 'PTS' && subscription.billing_cycle === 'points' && subscription.amount > 0 && !!subscription.ends_at;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setAutopay(null);
    if (!subscription) { setLoading(false); return; }
    supabase.from('subscription_autopay').select('enabled,status,points_per_renewal,last_renewed_at').eq('subscription_id', subscription.id).maybeSingle().then(({ data, error }) => {
      if (!cancelled) { setAutopay(data); setLoadError(!!error); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [subscription?.id]);

  async function save(enabled: boolean) {
    if (!subscription || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-plan-autopay', { body: { subscription_id: subscription.id, enabled } });
      if (error || !data?.success) {
        let message = data?.error || 'Could not update autopay';
        if (error && 'context' in error && error.context instanceof Response) {
          const detail = await error.context.json().catch(() => null);
          message = detail?.error || message;
        }
        throw new Error(message);
      }
      setAutopay(data.autopay);
      toast.success(enabled ? 'Plan autopay enabled' : 'Plan autopay disabled');
      await onChange();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update autopay'); }
    finally { setSaving(false); busy.current = false; setConfirming(false); }
  }
  return (
    <section className="space-y-3 border-t border-border pt-5" aria-label="Plan autopay">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary" />Plan Autopay</h4>
        {loading || saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Switch aria-label="Automatically renew plan" checked={!!autopay?.enabled} disabled={!eligible || loadError} onCheckedChange={(checked) => checked ? setConfirming(true) : void save(false)} />}
      </div>
      <Badge variant={autopay?.enabled ? 'default' : 'outline'}>{autopay?.status === 'insufficient_funds' ? 'Paused · insufficient points' : autopay?.enabled ? 'Enabled' : 'Off'}</Badge>
      {!eligible ? <p className="text-sm text-muted-foreground">No paid wallet-points plan available for automatic renewal.</p> : <>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted-foreground">Renewal charge</dt><dd className="font-medium">{subscription?.amount.toLocaleString()} pts / 30 days</dd></div>
          <div><dt className="text-muted-foreground">{autopay?.enabled ? 'Next renewal' : 'Plan ends'}</dt><dd className="font-medium">{subscription?.ends_at ? new Date(subscription.ends_at).toLocaleString() : '—'}</dd></div>
        </dl>
        <p className="text-sm text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4 shrink-0" />Wallet balance: {walletPoints.toLocaleString()} pts</p>
        {walletPoints < (subscription?.amount ?? 0) && <p className="text-sm text-destructive">Insufficient points for the next renewal. Top up your wallet before the plan ends.</p>}
        {autopay?.status === 'insufficient_funds' && <p className="text-sm text-muted-foreground">Top up your wallet, then enable autopay again.</p>}
        {autopay?.last_renewed_at && <p className="text-xs text-muted-foreground">Last renewed: {new Date(autopay.last_renewed_at).toLocaleString()}</p>}
      </>}
      {loadError && <p role="alert" className="text-sm text-destructive">Could not load autopay settings. Refresh to retry.</p>}
      <AlertDialog open={confirming} onOpenChange={(open) => { if (!saving) setConfirming(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Enable automatic plan renewal?</AlertDialogTitle><AlertDialogDescription>{subscription?.amount.toLocaleString()} wallet points will be deducted to renew your {subscription?.plan_name} plan for 30 days when it ends. Renewals are checked hourly, so processing may take up to one hour. No bank account or card will be charged. If your balance is too low, autopay pauses without a deduction. You can turn it off at any time.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={saving}>Not now</AlertDialogCancel><Button disabled={saving} onClick={() => void save(true)}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enable Autopay</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}