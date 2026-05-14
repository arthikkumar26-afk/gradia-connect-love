import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, LogOut, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import gradiaLogo from "@/assets/gradia-logo.png";

const HRPortalChoice = () => {
  const navigate = useNavigate();
  const { user, profile, logout, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) navigate("/hr/login");
  }, [isLoading, user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/hr/login");
  };

  return (
    <>
      <Helmet>
        <title>HR Portal - Gradia</title>
        <meta name="description" content="Choose between the employer-side and candidate-side HR dashboards on Gradia." />
        <link rel="canonical" href="https://gradiaa.com/hr/dashboard" />
      </Helmet>
      <div className="min-h-screen bg-subtle">
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <img src={gradiaLogo} alt="Gradia" className="h-7 w-auto" />
          <Badge variant="secondary" className="gap-1 text-xs">
            <Users className="h-3 w-3" /> HR Portal
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-tight">{profile?.full_name || "HR User"}</p>
            <p className="text-xs text-muted-foreground leading-tight">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 md:py-14 max-w-5xl">
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Choose a workspace</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Select which dashboard you want to manage today.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          {/* Employer card */}
          <Card
            className="group cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
            onClick={() => navigate("/hr/dashboard/employer")}
          >
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-blue-100 dark:bg-blue-900/40 mb-4">
                <Building2 className="h-7 w-7 text-blue-600 dark:text-blue-300" />
              </div>
              <h2 className="text-xl font-semibold mb-1">Employer</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Manage employer accounts, jobs, pipelines and CV scrutiny on behalf of your linked employer.
              </p>
              <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                Open Employer Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Candidate card */}
          <Card
            className="group cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
            onClick={() => navigate("/hr/dashboard/candidate")}
          >
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-pink-100 dark:bg-pink-900/40 mb-4">
                <Users className="h-7 w-7 text-pink-600 dark:text-pink-300" />
              </div>
              <h2 className="text-xl font-semibold mb-1">Candidate</h2>
              <p className="text-sm text-muted-foreground mb-5">
                View registered candidates, applications, profiles and run candidate-side workflows.
              </p>
              <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                Open Candidate Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    </>
  );
};

export default HRPortalChoice;
