import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface RoleSwitcherProps {
  current: "candidate" | "employer";
}

const RoleSwitcher = ({ current }: RoleSwitcherProps) => {
  const isCandidate = current === "candidate";
  return (
    <div className="w-full bg-muted/40 border border-border rounded-xl p-3 md:p-4 flex items-center justify-between gap-3">
      <div className="text-sm text-muted-foreground">
        Not your path? Switch role below.
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant={isCandidate ? "default" : "outline"} size="sm">
          <Link to="/candidate/create-profile?role=candidate">Candidate</Link>
        </Button>
        <Button asChild variant={!isCandidate ? "default" : "outline"} size="sm">
          <Link to="/employer/create-profile?role=employer">Employer</Link>
        </Button>
      </div>
    </div>
  );
};

export default RoleSwitcher;
