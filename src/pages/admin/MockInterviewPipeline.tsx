import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, Upload, FileText, Plus, Trash2, Edit, Eye, 
  Loader2, CheckCircle2, XCircle, BookOpen, Key, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";

interface QuestionPaper {
  id: string;
  title: string;
  description: string | null;
  stage_type: string;
  pdf_url: string;
  is_active: boolean;
  created_at: string;
  segment: string | null;
  category: string | null;
  designation: string | null;
}

interface Question {
  id: string;
  paper_id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options: any;
  marks: number;
  display_order: number;
}

interface AnswerKey {
  id: string;
  question_id: string;
  answer_text: string;
  keywords: string[];
  is_case_sensitive: boolean;
  min_keyword_match_percent: number;
}

export default function MockInterviewPipeline() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerKeys, setAnswerKeys] = useState<Record<string, AnswerKey>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("papers");
  
  // Form states
  const [newPaper, setNewPaper] = useState({
    title: '',
    description: '',
    stage_type: 'all' as string,
    segment: '',
    category: '',
    designation: '',
  });

  // Role-based options
  const segmentOptions = [
    'Pre-Primary', 'Primary', 'Secondary', 'Senior Secondary', 'Foundation', 'JEE', 'NEET'
  ];

  const categoryOptions: Record<string, string[]> = {
    'Pre-Primary': ['Teaching', 'Helping/Supporting', 'Admin'],
    'Primary': ['Teaching', 'Helping/Supporting', 'Admin'],
    'Secondary': ['Teaching', 'Admin', 'Non-Teaching'],
    'Senior Secondary': ['Teaching', 'Admin', 'Non-Teaching'],
    'Foundation': ['Teaching', 'Admin', 'Academic Support'],
    'JEE': ['Teaching', 'Admin', 'Academic Support'],
    'NEET': ['Teaching', 'Admin', 'Academic Support'],
  };

  const designationOptions: Record<string, Record<string, string[]>> = {
    'Pre-Primary': {
      'Teaching': ['MOTHER TEACHER', 'ASSO.TEACHER'],
      'Helping/Supporting': ['CARE TAKER', 'ATTENDER'],
      'Admin': ['VICE PRINCIPAL', 'COORDINATOR']
    },
    'Primary': {
      'Teaching': ['PRT', 'TGT', 'ASSO.TEACHER'],
      'Helping/Supporting': ['LAB ASSISTANT', 'ATTENDER'],
      'Admin': ['VICE PRINCIPAL', 'COORDINATOR', 'ADMIN EXECUTIVE']
    },
    'Secondary': {
      'Teaching': ['TGT', 'PGT', 'SENIOR TEACHER'],
      'Admin': ['VICE PRINCIPAL', 'COORDINATOR', 'ADMIN MANAGER'],
      'Non-Teaching': ['LAB ASSISTANT', 'LIBRARIAN', 'COUNSELOR']
    },
    'Senior Secondary': {
      'Teaching': ['PGT', 'SENIOR LECTURER', 'HOD'],
      'Admin': ['PRINCIPAL', 'VICE PRINCIPAL', 'ADMIN MANAGER'],
      'Non-Teaching': ['LAB ASSISTANT', 'LIBRARIAN', 'COUNSELOR']
    },
    'Foundation': {
      'Teaching': ['FACULTY', 'SENIOR FACULTY', 'HOD'],
      'Admin': ['CENTER HEAD', 'ADMIN EXECUTIVE'],
      'Academic Support': ['ACADEMIC COORDINATOR', 'TEST ANALYST']
    },
    'JEE': {
      'Teaching': ['FACULTY', 'SENIOR FACULTY', 'HOD'],
      'Admin': ['CENTER HEAD', 'ADMIN EXECUTIVE'],
      'Academic Support': ['ACADEMIC COORDINATOR', 'CONTENT DEVELOPER']
    },
    'NEET': {
      'Teaching': ['FACULTY', 'SENIOR FACULTY', 'HOD'],
      'Admin': ['CENTER HEAD', 'ADMIN EXECUTIVE'],
      'Academic Support': ['ACADEMIC COORDINATOR', 'CONTENT DEVELOPER']
    }
  };

  const getCurrentCategories = () => {
    return newPaper.segment ? categoryOptions[newPaper.segment] || [] : [];
  };

  const getCurrentDesignations = () => {
    if (!newPaper.segment || !newPaper.category) return [];
    return designationOptions[newPaper.segment]?.[newPaper.category] || [];
  };
  const [questionPdfFile, setQuestionPdfFile] = useState<File | null>(null);
  const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [extractedAnswers, setExtractedAnswers] = useState<any[]>([]);

  useEffect(() => {
    loadPapers();
  }, []);

  useEffect(() => {
    if (selectedPaper) {
      loadQuestions(selectedPaper.id);
    }
  }, [selectedPaper]);

  const loadPapers = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_question_papers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPapers(data || []);
    } catch (error) {
      console.error('Error loading papers:', error);
      toast.error('Failed to load question papers');
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async (paperId: string) => {
    try {
      const { data: questionsData, error: questionsError } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('paper_id', paperId)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Load answer keys for all questions
      if (questionsData && questionsData.length > 0) {
        const questionIds = questionsData.map(q => q.id);
        const { data: answersData, error: answersError } = await supabase
          .from('interview_answer_keys')
          .select('*')
          .in('question_id', questionIds);

        if (answersError) throw answersError;
        
        const answersMap: Record<string, AnswerKey> = {};
        answersData?.forEach(a => {
          answersMap[a.question_id] = a;
        });
        setAnswerKeys(answersMap);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    }
  };

  const handleQuestionPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQuestionPdfFile(file);
      setExtractedQuestions([]);
    }
  };

  const handleAnswerPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnswerPdfFile(file);
      setExtractedAnswers([]);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    // For now, we'll read the file as text (works for text-based PDFs)
    // In production, you'd use a PDF parsing library
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        // Basic extraction - in production use pdf.js or similar
        resolve(text);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseQuestionPdf = async () => {
    if (!questionPdfFile) {
      toast.error('Please select a question PDF first');
      return;
    }

    setIsParsing(true);
    try {
      // Read file content
      const text = await questionPdfFile.text();
      
      const { data, error } = await supabase.functions.invoke('parse-question-paper', {
        body: { pdfText: text, paperType: newPaper.stage_type }
      });

      if (error) throw error;
      
      if (data.questions && data.questions.length > 0) {
        setExtractedQuestions(data.questions);
        toast.success(`Extracted ${data.questions.length} questions`);
      } else {
        toast.warning('No questions found in the PDF. Please check the format.');
      }
    } catch (error) {
      console.error('Error parsing question PDF:', error);
      toast.error('Failed to parse question PDF');
    } finally {
      setIsParsing(false);
    }
  };

  const parseAnswerPdf = async () => {
    if (!answerPdfFile) {
      toast.error('Please select an answer key PDF first');
      return;
    }

    setIsParsing(true);
    try {
      const text = await answerPdfFile.text();
      
      const { data, error } = await supabase.functions.invoke('parse-answer-key', {
        body: { pdfText: text, questionCount: extractedQuestions.length }
      });

      if (error) throw error;
      
      if (data.answers && data.answers.length > 0) {
        setExtractedAnswers(data.answers);
        toast.success(`Extracted ${data.answers.length} answers`);
      } else {
        toast.warning('No answers found in the PDF. Please check the format.');
      }
    } catch (error) {
      console.error('Error parsing answer PDF:', error);
      toast.error('Failed to parse answer key PDF');
    } finally {
      setIsParsing(false);
    }
  };

  const savePaperWithQuestionsAndAnswers = async () => {
    if (!newPaper.title) {
      toast.error('Please enter a title');
      return;
    }
    if (extractedQuestions.length === 0) {
      toast.error('Please extract questions from PDF first');
      return;
    }

    setIsUploading(true);
    try {
      // Upload question PDF to storage
      let pdfUrl = '';
      if (questionPdfFile) {
        const fileName = `${Date.now()}-${questionPdfFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resumes') // Using existing bucket
          .upload(`question-papers/${fileName}`, questionPdfFile);

        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(`question-papers/${fileName}`);
        pdfUrl = urlData.publicUrl;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create the paper
      const { data: paperData, error: paperError } = await supabase
        .from('interview_question_papers')
        .insert({
          title: newPaper.title,
          description: newPaper.description || null,
          stage_type: newPaper.stage_type,
          pdf_url: pdfUrl || 'manual-entry',
          created_by: user?.id,
          segment: newPaper.segment || null,
          category: newPaper.category || null,
          designation: newPaper.designation || null
        })
        .select()
        .single();

      if (paperError) throw paperError;

      // Insert questions
      const questionsToInsert = extractedQuestions.map((q, index) => ({
        paper_id: paperData.id,
        question_number: q.question_number || index + 1,
        question_text: q.question_text,
        question_type: q.question_type || 'text',
        options: q.options || null,
        marks: 1,
        display_order: index
      }));

      const { data: insertedQuestions, error: questionsError } = await supabase
        .from('interview_questions')
        .insert(questionsToInsert)
        .select();

      if (questionsError) throw questionsError;

      // Insert answer keys if we have them
      if (extractedAnswers.length > 0 && insertedQuestions) {
        const answerKeysToInsert = extractedAnswers.map(a => {
          // Find matching question by number
          const matchingQuestion = insertedQuestions.find(
            q => q.question_number === a.question_number
          );
          if (!matchingQuestion) return null;

          return {
            question_id: matchingQuestion.id,
            answer_text: a.answer_text,
            keywords: a.keywords || [],
            is_case_sensitive: false,
            min_keyword_match_percent: 50
          };
        }).filter(Boolean);

        if (answerKeysToInsert.length > 0) {
          const { error: answersError } = await supabase
            .from('interview_answer_keys')
            .insert(answerKeysToInsert);

          if (answersError) {
            console.error('Error inserting answer keys:', answersError);
          }
        }
      }

      toast.success('Question paper saved successfully!');
      setShowAddDialog(false);
      resetForm();
      loadPapers();
    } catch (error) {
      console.error('Error saving paper:', error);
      toast.error('Failed to save question paper');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setNewPaper({ title: '', description: '', stage_type: 'all', segment: '', category: '', designation: '' });
    setQuestionPdfFile(null);
    setAnswerPdfFile(null);
    setExtractedQuestions([]);
    setExtractedAnswers([]);
  };

  const deletePaper = async (paperId: string) => {
    if (!confirm('Are you sure you want to delete this paper and all its questions?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('interview_question_papers')
        .delete()
        .eq('id', paperId);

      if (error) throw error;
      toast.success('Paper deleted');
      loadPapers();
      if (selectedPaper?.id === paperId) {
        setSelectedPaper(null);
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error deleting paper:', error);
      toast.error('Failed to delete paper');
    }
  };

  const togglePaperActive = async (paper: QuestionPaper) => {
    try {
      const { error } = await supabase
        .from('interview_question_papers')
        .update({ is_active: !paper.is_active })
        .eq('id', paper.id);

      if (error) throw error;
      toast.success(paper.is_active ? 'Paper deactivated' : 'Paper activated');
      loadPapers();
    } catch (error) {
      console.error('Error toggling paper:', error);
      toast.error('Failed to update paper');
    }
  };

  const getStageLabel = (stageType: string) => {
    switch (stageType) {
      case 'technical_assessment': return 'Technical Assessment';
      case 'demo_round': return 'Demo Round';
      case 'viva': return 'Viva';
      case 'all': return 'All Stages';
      default: return stageType;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Mock Interview Pipeline</h1>
                <p className="text-sm text-muted-foreground">
                  Manage question papers and answer keys for interviews
                </p>
              </div>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Question Paper
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Question Paper</DialogTitle>
                  <DialogDescription>
                    Upload a question PDF and answer key PDF. AI will extract questions and answers automatically.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input 
                        placeholder="e.g., Mathematics Technical Test"
                        value={newPaper.title}
                        onChange={(e) => setNewPaper(p => ({ ...p, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stage Type *</Label>
                      <Select 
                        value={newPaper.stage_type} 
                        onValueChange={(v) => setNewPaper(p => ({ ...p, stage_type: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stages</SelectItem>
                          <SelectItem value="technical_assessment">Technical Assessment</SelectItem>
                          <SelectItem value="demo_round">Demo Round</SelectItem>
                          <SelectItem value="viva">Viva</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Optional description..."
                      value={newPaper.description}
                      onChange={(e) => setNewPaper(p => ({ ...p, description: e.target.value }))}
                    />
                  </div>

                  {/* Role-based Assignment */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Role-Based Assignment</CardTitle>
                      <CardDescription>Assign this paper to specific roles (optional)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Segment</Label>
                          <Select 
                            value={newPaper.segment} 
                            onValueChange={(v) => setNewPaper(p => ({ ...p, segment: v, category: '', designation: '' }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select segment" />
                            </SelectTrigger>
                            <SelectContent>
                              {segmentOptions.map(seg => (
                                <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select 
                            value={newPaper.category} 
                            onValueChange={(v) => setNewPaper(p => ({ ...p, category: v, designation: '' }))}
                            disabled={!newPaper.segment}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {getCurrentCategories().map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Designation</Label>
                          <Select 
                            value={newPaper.designation} 
                            onValueChange={(v) => setNewPaper(p => ({ ...p, designation: v }))}
                            disabled={!newPaper.category}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select designation" />
                            </SelectTrigger>
                            <SelectContent>
                              {getCurrentDesignations().map(des => (
                                <SelectItem key={des} value={des}>{des}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Question PDF Upload */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Question Paper PDF
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-3">
                        <Input 
                          type="file" 
                          accept=".pdf,.txt"
                          onChange={handleQuestionPdfChange}
                          className="flex-1"
                        />
                        <Button 
                          onClick={parseQuestionPdf} 
                          disabled={!questionPdfFile || isParsing}
                          variant="secondary"
                        >
                          {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          <span className="ml-2">Extract Questions</span>
                        </Button>
                      </div>
                      {extractedQuestions.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium">Extracted {extractedQuestions.length} questions</span>
                          </div>
                          <ScrollArea className="h-32">
                            <div className="space-y-1 text-sm">
                              {extractedQuestions.map((q, i) => (
                                <div key={i} className="text-muted-foreground">
                                  <strong>Q{q.question_number}:</strong> {q.question_text.substring(0, 80)}...
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Answer Key PDF Upload */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Answer Key PDF
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-3">
                        <Input 
                          type="file" 
                          accept=".pdf,.txt"
                          onChange={handleAnswerPdfChange}
                          className="flex-1"
                        />
                        <Button 
                          onClick={parseAnswerPdf} 
                          disabled={!answerPdfFile || isParsing}
                          variant="secondary"
                        >
                          {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          <span className="ml-2">Extract Answers</span>
                        </Button>
                      </div>
                      {extractedAnswers.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium">Extracted {extractedAnswers.length} answers with keywords</span>
                          </div>
                          <ScrollArea className="h-32">
                            <div className="space-y-1 text-sm">
                              {extractedAnswers.map((a, i) => (
                                <div key={i} className="text-muted-foreground">
                                  <strong>A{a.question_number}:</strong> {a.answer_text.substring(0, 60)}... 
                                  <span className="text-blue-600 ml-1">
                                    [{a.keywords?.slice(0, 3).join(', ')}{a.keywords?.length > 3 ? '...' : ''}]
                                  </span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={savePaperWithQuestionsAndAnswers}
                      disabled={isUploading || !newPaper.title || extractedQuestions.length === 0}
                    >
                      {isUploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Question Paper
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Papers List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Question Papers
              </CardTitle>
              <CardDescription>{papers.length} papers uploaded</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2">
                  {papers.map(paper => (
                    <div
                      key={paper.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPaper?.id === paper.id 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedPaper(paper)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{paper.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getStageLabel(paper.stage_type)}
                            </Badge>
                            <Badge variant={paper.is_active ? "default" : "secondary"} className="text-xs">
                              {paper.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {paper.segment && (
                              <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {paper.segment}
                              </Badge>
                            )}
                          </div>
                          {(paper.category || paper.designation) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {paper.category}{paper.category && paper.designation && ' → '}{paper.designation}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); togglePaperActive(paper); }}
                          >
                            {paper.is_active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => { e.stopPropagation(); deletePaper(paper.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {papers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No question papers yet</p>
                      <p className="text-sm">Click "Add Question Paper" to get started</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Questions & Answers View */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedPaper ? selectedPaper.title : 'Select a Paper'}
              </CardTitle>
              <CardDescription>
                {selectedPaper 
                  ? `${questions.length} questions • ${getStageLabel(selectedPaper.stage_type)}${selectedPaper.segment ? ` • ${selectedPaper.segment}` : ''}${selectedPaper.designation ? ` • ${selectedPaper.designation}` : ''}`
                  : 'Click on a paper to view its questions and answer keys'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedPaper ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="questions">Questions</TabsTrigger>
                    <TabsTrigger value="answers">Answer Keys</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="questions">
                    <ScrollArea className="h-[55vh]">
                      <div className="space-y-4">
                        {questions.map((q, index) => (
                          <Card key={q.id} className="bg-muted/30">
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                <Badge className="shrink-0">Q{q.question_number}</Badge>
                                <div className="flex-1">
                                  <p className="font-medium">{q.question_text}</p>
                                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                    <Badge variant="outline">{q.question_type}</Badge>
                                    <span>• {q.marks} mark{q.marks > 1 ? 's' : ''}</span>
                                  </div>
                                  {q.options && q.options.length > 0 && (
                                    <div className="mt-2 pl-4 space-y-1">
                                      {q.options.map((opt, i) => (
                                        <p key={i} className="text-sm">{opt}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {questions.length === 0 && (
                          <div className="text-center py-12 text-muted-foreground">
                            No questions found for this paper
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="answers">
                    <ScrollArea className="h-[55vh]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Q#</TableHead>
                            <TableHead>Answer</TableHead>
                            <TableHead>Keywords</TableHead>
                            <TableHead className="w-24">Match %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {questions.map(q => {
                            const answer = answerKeys[q.id];
                            return (
                              <TableRow key={q.id}>
                                <TableCell className="font-medium">{q.question_number}</TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {answer?.answer_text || <span className="text-muted-foreground italic">No answer key</span>}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {answer?.keywords?.slice(0, 5).map((kw, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                                    ))}
                                    {answer?.keywords?.length > 5 && (
                                      <Badge variant="outline" className="text-xs">+{answer.keywords.length - 5}</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{answer?.min_keyword_match_percent || 50}%</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {questions.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          No questions to show answer keys for
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex items-center justify-center h-[55vh] text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a paper from the list to view details</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
