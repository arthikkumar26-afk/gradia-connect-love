import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  GraduationCap,
  Sparkles,
  Loader2,
  ExternalLink,
  Star,
  MapPin,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AILearningRecommendationsProps {
  stageResults: any[];
  candidateProfile: any;
  compact?: boolean;
}

interface LearningResources {
  mentors: { name: string; expertise: string; reason: string; platform: string; specialization: string }[];
  edtechCourses: { title: string; platform: string; description: string; skillArea: string; duration: string; level: string }[];
  institutions: { name: string; type: string; program: string; reason: string; location: string }[];
  overallAdvice: string;
}

export default function AILearningRecommendations({ stageResults, candidateProfile, compact = false }: AILearningRecommendationsProps) {
  const [resources, setResources] = useState<LearningResources | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    if (!stageResults || stageResults.length === 0) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-learning-resources', {
        body: {
          stageResults,
          candidateProfile: {
            preferred_role: candidateProfile?.preferred_role,
            primary_subject: candidateProfile?.primary_subject,
            experience_level: candidateProfile?.experience_level,
            segment: candidateProfile?.segment,
            category: candidateProfile?.category,
          }
        }
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }

      setResources(data);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error fetching AI recommendations:", error);
      toast({ title: "Error", description: "Failed to get AI recommendations. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasLoaded && !isLoading) {
    return (
      <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">AI Learning Recommendations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get personalized suggestions for mentors, courses & institutions based on your mock test performance
            </p>
          </div>
          <Button onClick={fetchRecommendations} className="gap-2" disabled={!stageResults || stageResults.length === 0}>
            <Sparkles className="h-4 w-4" />
            Get AI Recommendations
          </Button>
          {(!stageResults || stageResults.length === 0) && (
            <p className="text-xs text-muted-foreground">Complete a mock test first to get personalized recommendations</p>
          )}
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">AI is analyzing your performance and finding the best resources...</span>
        </div>
      </Card>
    );
  }

  if (!resources) return null;

  return (
    <div className="space-y-5">
      {/* Overall Advice */}
      {resources.overallAdvice && (
        <Card className="p-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-foreground mb-1">AI Career Advice</h4>
              <p className="text-sm text-muted-foreground">{resources.overallAdvice}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Mentors Section */}
      {resources.mentors.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-foreground">Recommended Mentors</h3>
              </div>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                {resources.mentors.length} Mentors
              </Badge>
            </div>
          </div>
          <div className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {resources.mentors.slice(0, compact ? 3 : undefined).map((mentor, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-border hover:border-blue-500/50 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                    {mentor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">{mentor.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{mentor.expertise}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{mentor.reason}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{mentor.specialization}</Badge>
                  <span className="text-xs text-muted-foreground">{mentor.platform}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* EdTech Courses Section */}
      {resources.edtechCourses.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold text-foreground">Recommended Courses</h3>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                {resources.edtechCourses.length} Courses
              </Badge>
            </div>
          </div>
          <div className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {resources.edtechCourses.slice(0, compact ? 3 : undefined).map((course, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-border hover:border-emerald-500/50 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">{course.skillArea}</Badge>
                  <Badge variant="secondary" className="text-xs">{course.level}</Badge>
                </div>
                <h4 className="font-medium text-sm mb-1 line-clamp-2">{course.title}</h4>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-emerald-600">{course.platform}</span>
                  <span className="text-muted-foreground">{course.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Institutions Section */}
      {resources.institutions.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold text-foreground">Recommended Institutions</h3>
              </div>
              <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
                {resources.institutions.length} Institutions
              </Badge>
            </div>
          </div>
          <div className="p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {resources.institutions.slice(0, compact ? 3 : undefined).map((inst, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-border hover:border-purple-500/50 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">{inst.type}</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {inst.location}
                  </div>
                </div>
                <h4 className="font-medium text-sm mb-1">{inst.name}</h4>
                <p className="text-xs text-primary font-medium mb-1">{inst.program}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{inst.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={fetchRecommendations} disabled={isLoading} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Recommendations
        </Button>
      </div>
    </div>
  );
}
