import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineJobCreationForm } from "@/components/employer/InlineJobCreationForm";

const CreatePosition = () => {
  const navigate = useNavigate();

  const goBack = () => navigate("/employer/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">Create Position</h1>
              <p className="text-xs text-muted-foreground">
                Post a new position with interview pipeline, requirements, and AI screening
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <InlineJobCreationForm
          onJobCreated={goBack}
          onCancel={goBack}
        />
      </div>
    </div>
  );
};

export default CreatePosition;
