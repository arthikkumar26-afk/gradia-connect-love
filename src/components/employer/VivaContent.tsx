import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Users, 
  ClipboardList, 
  Star,
  UserCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  GripVertical
} from "lucide-react";

interface VivaCriteria {
  id: string;
  name: string;
  description: string | null;
  max_score: number;
  weight: number;
  category: string;
  display_order: number;
  is_active: boolean;
}

interface VivaCandidate {
  id: string;
  candidate_id: string;
  job_id: string;
  candidate_name: string;
  job_title: string;
  status: string;
  session_status?: string;
  overall_score?: number;
  recommendation?: string;
}

interface VivaEvaluation {
  criteria_id: string;
  score: number;
  notes: string;
}

const DEFAULT_CRITERIA = [
  { name: "Communication Skills", description: "Clarity, articulation, and ability to express ideas effectively", category: "soft_skills" },
  { name: "Subject Knowledge", description: "Depth of understanding in the relevant domain", category: "technical" },
  { name: "Problem Solving", description: "Ability to analyze and solve problems logically", category: "technical" },
  { name: "Confidence", description: "Composure and self-assurance during the interview", category: "soft_skills" },
  { name: "Critical Thinking", description: "Ability to evaluate information and make reasoned judgments", category: "soft_skills" },
  { name: "Presentation", description: "Professional appearance and demeanor", category: "general" },
];

export function VivaContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("candidates");
  const [criteria, setCriteria] = useState<VivaCriteria[]>([]);
  const [candidates, setCandidates] = useState<VivaCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCriteria, setShowAddCriteria] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<VivaCandidate | null>(null);
  const [evaluations, setEvaluations] = useState<Record<string, VivaEvaluation>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [recommendation, setRecommendation] = useState<string>("");
  const [evaluatorName, setEvaluatorName] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [newCriteria, setNewCriteria] = useState({
    name: "",
    description: "",
    max_score: 10,
    weight: 1,
    category: "general"
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCriteria(), fetchVivaCandidates()]);
    setLoading(false);
  };

  const fetchCriteria = async () => {
    const { data, error } = await supabase
      .from('viva_criteria')
      .select('*')
      .eq('employer_id', user?.id)
      .eq('is_active', true)
      .order('display_order');
    
    if (error) {
      console.error('Error fetching criteria:', error);
      return;
    }
    setCriteria(data || []);
  };

  const fetchVivaCandidates = async () => {
    // Get the Viva stage ID
    const { data: vivaStage } = await supabase
      .from('interview_stages')
      .select('id')
      .eq('name', 'Viva')
      .single();

    if (!vivaStage) return;

    // Fetch candidates in Viva stage for employer's jobs
    const { data: candidatesData, error } = await supabase
      .from('interview_candidates')
      .select(`
        id,
        candidate_id,
        job_id,
        status,
        current_stage_id,
        profiles:candidate_id (full_name),
        jobs:job_id (job_title, employer_id)
      `)
      .eq('current_stage_id', vivaStage.id);

    if (error) {
      console.error('Error fetching viva candidates:', error);
      return;
    }

    // Filter for employer's jobs and format data
    const formattedCandidates: VivaCandidate[] = [];
    
    for (const c of candidatesData || []) {
      const jobs = c.jobs as any;
      const profiles = c.profiles as any;
      
      if (jobs?.employer_id === user?.id) {
        // Fetch viva session if exists
        const { data: session } = await supabase
          .from('viva_sessions')
          .select('status, overall_score, recommendation')
          .eq('interview_candidate_id', c.id)
          .single();

        formattedCandidates.push({
          id: c.id,
          candidate_id: c.candidate_id,
          job_id: c.job_id,
          candidate_name: profiles?.full_name || 'Unknown',
          job_title: jobs?.job_title || 'Unknown Position',
          status: c.status || 'active',
          session_status: session?.status,
          overall_score: session?.overall_score,
          recommendation: session?.recommendation
        });
      }
    }

    setCandidates(formattedCandidates);
  };

  const initializeDefaultCriteria = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    const criteriaToInsert = DEFAULT_CRITERIA.map((c, index) => ({
      employer_id: user.id,
      name: c.name,
      description: c.description,
      max_score: 10,
      weight: 1,
      category: c.category,
      display_order: index
    }));

    const { error } = await supabase
      .from('viva_criteria')
      .insert(criteriaToInsert);

    if (error) {
      toast.error("Failed to initialize criteria");
    } else {
      toast.success("Default criteria added");
      fetchCriteria();
    }
    setSaving(false);
  };

  const addCriteria = async () => {
    if (!newCriteria.name.trim()) {
      toast.error("Please enter criteria name");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('viva_criteria')
      .insert({
        employer_id: user?.id,
        name: newCriteria.name,
        description: newCriteria.description,
        max_score: newCriteria.max_score,
        weight: newCriteria.weight,
        category: newCriteria.category,
        display_order: criteria.length
      });

    if (error) {
      toast.error("Failed to add criteria");
    } else {
      toast.success("Criteria added");
      setShowAddCriteria(false);
      setNewCriteria({ name: "", description: "", max_score: 10, weight: 1, category: "general" });
      fetchCriteria();
    }
    setSaving(false);
  };

  const deleteCriteria = async (id: string) => {
    const { error } = await supabase
      .from('viva_criteria')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete criteria");
    } else {
      toast.success("Criteria removed");
      fetchCriteria();
    }
  };

  const openEvaluateModal = async (candidate: VivaCandidate) => {
    setSelectedCandidate(candidate);
    setEvaluations({});
    setOverallFeedback("");
    setRecommendation("");
    
    // Initialize evaluations with criteria
    const initialEvals: Record<string, VivaEvaluation> = {};
    criteria.forEach(c => {
      initialEvals[c.id] = { criteria_id: c.id, score: 5, notes: "" };
    });
    
    // Fetch existing evaluations if any
    const { data: existingEvals } = await supabase
      .from('viva_evaluations')
      .select('*')
      .eq('interview_candidate_id', candidate.id);

    if (existingEvals) {
      existingEvals.forEach(e => {
        initialEvals[e.criteria_id] = {
          criteria_id: e.criteria_id,
          score: e.score,
          notes: e.notes || ""
        };
      });
    }

    // Fetch existing session
    const { data: session } = await supabase
      .from('viva_sessions')
      .select('*')
      .eq('interview_candidate_id', candidate.id)
      .single();

    if (session) {
      setOverallFeedback(session.overall_feedback || "");
      setRecommendation(session.recommendation || "");
      setEvaluatorName(session.evaluator_name || "");
    }

    setEvaluations(initialEvals);
    setShowEvaluateModal(true);
  };

  const saveEvaluation = async () => {
    if (!selectedCandidate) return;
    
    setSaving(true);
    try {
      // Upsert evaluations
      for (const [criteriaId, evaluation] of Object.entries(evaluations)) {
        await supabase
          .from('viva_evaluations')
          .upsert({
            interview_candidate_id: selectedCandidate.id,
            criteria_id: criteriaId,
            score: evaluation.score,
            notes: evaluation.notes,
            evaluator_name: evaluatorName,
            evaluated_at: new Date().toISOString()
          }, {
            onConflict: 'interview_candidate_id,criteria_id'
          });
      }

      // Calculate overall score
      let totalScore = 0;
      let totalWeight = 0;
      criteria.forEach(c => {
        const eval_ = evaluations[c.id];
        if (eval_) {
          totalScore += (eval_.score / c.max_score) * c.weight * 100;
          totalWeight += c.weight;
        }
      });
      const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      // Upsert viva session
      const { data: existingSession } = await supabase
        .from('viva_sessions')
        .select('id')
        .eq('interview_candidate_id', selectedCandidate.id)
        .single();

      if (existingSession) {
        await supabase
          .from('viva_sessions')
          .update({
            overall_score: overallScore,
            overall_feedback: overallFeedback,
            recommendation: recommendation || null,
            evaluator_name: evaluatorName,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', existingSession.id);
      } else {
        await supabase
          .from('viva_sessions')
          .insert({
            interview_candidate_id: selectedCandidate.id,
            overall_score: overallScore,
            overall_feedback: overallFeedback,
            recommendation: recommendation || null,
            evaluator_name: evaluatorName,
            status: 'completed',
            completed_at: new Date().toISOString()
          });
      }

      toast.success("Evaluation saved successfully");
      setShowEvaluateModal(false);
      fetchVivaCandidates();
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast.error("Failed to save evaluation");
    }
    setSaving(false);
  };

  const getRecommendationBadge = (rec: string) => {
    const styles: Record<string, string> = {
      strong_hire: "bg-green-500/10 text-green-600 border-green-500/20",
      hire: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      maybe: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      no_hire: "bg-red-500/10 text-red-600 border-red-500/20"
    };
    const labels: Record<string, string> = {
      strong_hire: "Strong Hire",
      hire: "Hire",
      maybe: "Maybe",
      no_hire: "No Hire"
    };
    return (
      <Badge variant="outline" className={styles[rec] || ""}>
        {labels[rec] || rec}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="candidates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Candidates
          </TabsTrigger>
          <TabsTrigger value="criteria" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Evaluation Criteria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candidates" className="mt-6">
          {candidates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Candidates in Viva Stage</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Candidates will appear here once they progress to the Viva stage in the interview pipeline.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {candidates.map((candidate) => (
                <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{candidate.candidate_name}</h4>
                          <p className="text-sm text-muted-foreground">{candidate.job_title}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {candidate.session_status === 'completed' ? (
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold">{candidate.overall_score?.toFixed(0)}%</span>
                              </div>
                              {candidate.recommendation && getRecommendationBadge(candidate.recommendation)}
                            </div>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Evaluated
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        
                        <Button 
                          onClick={() => openEvaluateModal(candidate)}
                          variant={candidate.session_status === 'completed' ? "outline" : "default"}
                        >
                          {candidate.session_status === 'completed' ? 'View/Edit' : 'Evaluate'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="criteria" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Evaluation Criteria</CardTitle>
                <CardDescription>Define the scoring rubrics for viva evaluations</CardDescription>
              </div>
              <div className="flex gap-2">
                {criteria.length === 0 && (
                  <Button variant="outline" onClick={initializeDefaultCriteria} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Use Default Criteria
                  </Button>
                )}
                <Button onClick={() => setShowAddCriteria(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Criteria
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {criteria.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No evaluation criteria defined yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add criteria or use the default set to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {criteria.map((c, index) => (
                    <div 
                      key={c.id} 
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{c.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {c.category}
                            </Badge>
                          </div>
                          {c.description && (
                            <p className="text-sm text-muted-foreground">{c.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          Max: {c.max_score} • Weight: {c.weight}x
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteCriteria(c.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Criteria Dialog */}
      <Dialog open={showAddCriteria} onOpenChange={setShowAddCriteria}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Evaluation Criteria</DialogTitle>
            <DialogDescription>
              Define a new criterion for evaluating candidates during viva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={newCriteria.name}
                onChange={(e) => setNewCriteria({ ...newCriteria, name: e.target.value })}
                placeholder="e.g., Communication Skills"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newCriteria.description}
                onChange={(e) => setNewCriteria({ ...newCriteria, description: e.target.value })}
                placeholder="Brief description of what to evaluate"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Max Score</label>
                <Input
                  type="number"
                  value={newCriteria.max_score}
                  onChange={(e) => setNewCriteria({ ...newCriteria, max_score: parseInt(e.target.value) || 10 })}
                  min={1}
                  max={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Weight</label>
                <Input
                  type="number"
                  value={newCriteria.weight}
                  onChange={(e) => setNewCriteria({ ...newCriteria, weight: parseFloat(e.target.value) || 1 })}
                  min={0.1}
                  max={10}
                  step={0.1}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={newCriteria.category} 
                onValueChange={(v) => setNewCriteria({ ...newCriteria, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="soft_skills">Soft Skills</SelectItem>
                  <SelectItem value="domain">Domain Knowledge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCriteria(false)}>Cancel</Button>
            <Button onClick={addCriteria} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Criteria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluate Candidate Dialog */}
      <Dialog open={showEvaluateModal} onOpenChange={setShowEvaluateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Evaluate Candidate</DialogTitle>
            <DialogDescription>
              {selectedCandidate?.candidate_name} - {selectedCandidate?.job_title}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium">Evaluator Name</label>
                <Input
                  value={evaluatorName}
                  onChange={(e) => setEvaluatorName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Scoring Rubrics</h4>
                {criteria.map((c) => (
                  <div key={c.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium">{c.name}</h5>
                        {c.description && (
                          <p className="text-xs text-muted-foreground">{c.description}</p>
                        )}
                      </div>
                      <div className="text-lg font-bold text-primary">
                        {evaluations[c.id]?.score || 0} / {c.max_score}
                      </div>
                    </div>
                    <Slider
                      value={[evaluations[c.id]?.score || 0]}
                      onValueChange={(v) => setEvaluations({
                        ...evaluations,
                        [c.id]: { ...evaluations[c.id], score: v[0] }
                      })}
                      max={c.max_score}
                      step={1}
                      className="w-full"
                    />
                    <Input
                      placeholder="Notes for this criterion (optional)"
                      value={evaluations[c.id]?.notes || ""}
                      onChange={(e) => setEvaluations({
                        ...evaluations,
                        [c.id]: { ...evaluations[c.id], notes: e.target.value }
                      })}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium">Overall Feedback</label>
                <Textarea
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="Provide overall feedback for the candidate..."
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Recommendation</label>
                <Select value={recommendation} onValueChange={setRecommendation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recommendation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strong_hire">Strong Hire</SelectItem>
                    <SelectItem value="hire">Hire</SelectItem>
                    <SelectItem value="maybe">Maybe</SelectItem>
                    <SelectItem value="no_hire">No Hire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvaluateModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveEvaluation} disabled={saving || criteria.length === 0}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Evaluation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}