import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Briefcase } from "lucide-react";
import { InlineJobCreationForm } from "@/components/employer/InlineJobCreationForm";

const PostJob = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-subtle py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/employer/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Post a New Job</CardTitle>
                <CardDescription>Same vacancy creation flow as your employer panel.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <InlineJobCreationForm
              onJobCreated={() => navigate("/employer/dashboard?menu=my-vacancies")}
              onCancel={() => navigate("/employer/dashboard")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostJob;
