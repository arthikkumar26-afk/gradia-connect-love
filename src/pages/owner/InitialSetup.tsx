import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const InitialSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleBecomeOwner = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in first before setting up owner access.",
          variant: "destructive",
        });
        navigate("/owner/login");
        return;
      }

      const response = await supabase.functions.invoke("manage-user-roles", {
        body: { action: "seed-initial-owner" },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setIsComplete(true);
      toast({
        title: "Success!",
        description: "You have been assigned as the system owner.",
      });

      setTimeout(() => {
        navigate("/owner/dashboard");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to complete initial setup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 w-fit mb-4">
            <Crown className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
          <CardTitle className="text-2xl">Initial Owner Setup</CardTitle>
          <CardDescription>
            Set up the first owner account for your platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isComplete ? (
            <div className="text-center space-y-4">
              <div className="mx-auto p-4 rounded-full bg-green-100 dark:bg-green-900/30 w-fit">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Setup Complete!</h3>
                <p className="text-muted-foreground">Redirecting to dashboard...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Crown className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Owner Role</p>
                    <p>Full system access including admin management, revenue analytics, and system configuration.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Admin Role</p>
                    <p>Platform management including user management, job moderation, and reports.</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> This setup can only be completed once. Make sure you're logged in with the correct account.
                </p>
              </div>

              <Button 
                onClick={handleBecomeOwner} 
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Become System Owner
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                You must be logged in to complete this setup
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InitialSetup;
