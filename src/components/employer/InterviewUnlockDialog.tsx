import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Wallet } from "lucide-react";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  candidateName?: string;
  walletPoints: number;
  cost: number;
  unlocking: boolean;
}

export const InterviewUnlockDialog = ({
  open,
  onCancel,
  onConfirm,
  candidateName,
  walletPoints,
  cost,
  unlocking,
}: Props) => {
  const insufficient = walletPoints < cost;
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Unlock Interview Access
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              To take interviews with{" "}
              <strong>{candidateName || "this candidate"}</strong>, pay{" "}
              <strong>{cost} pts</strong> from your wallet. This is a
              one-time fee per candidate.
            </span>
            <span className="block text-sm">
              Your balance: <strong>{walletPoints} pts</strong>
              {insufficient && (
                <span className="text-destructive"> — Insufficient balance</span>
              )}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={unlocking}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={unlocking || insufficient}
          >
            {unlocking ? "Processing..." : `Pay ${cost} pts`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
