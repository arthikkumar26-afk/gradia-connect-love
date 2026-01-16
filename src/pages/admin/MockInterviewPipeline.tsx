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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  ArrowLeft, Upload, FileText, Plus, Trash2, Eye, 
  Loader2, CheckCircle2, XCircle, BookOpen, Key, RefreshCw,
  ChevronDown, FolderOpen
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
  const [activeTab, setActiveTab] = useState("questions");
  
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
    'Primary': ['Teaching', 'Helping/Supporting', 'Admin', 'CLASS-1&2', 'CLASSES-3,4&5'],
    'Secondary': ['Teaching', 'Admin', 'Non-Teaching'],
    'Senior Secondary': ['Teaching', 'Admin', 'Non-Teaching'],
    'Foundation': ['Teaching', 'Admin', 'Academic Support'],
    'JEE': ['Teaching', 'Admin', 'Academic Support'],
    'NEET': ['Teaching', 'Admin', 'Academic Support'],
  };

  const designationOptions: Record<string, Record<string, string[]>> = {
    'Pre-Primary': {
      'Teaching': ['MOTHER TEACHER', 'ASSO.TEACHER', '1st Language', '2nd Language', '3rd Language', 'Telugu', 'Hindi', 'English', 'MATHS', 'GEN.SCIENCE', 'SOCIAL', 'COMPUTERS', 'PHYSICAL EDUCATION', 'CCA'],
      'Helping/Supporting': ['CARE TAKER', 'ATTENDER'],
      'Admin': ['VICE PRINCIPAL', 'COORDINATOR']
    },
    'Primary': {
      'Teaching': ['PRT', 'TGT', 'ASSO.TEACHER'],
      'Helping/Supporting': ['LAB ASSISTANT', 'ATTENDER'],
      'Admin': ['VICE PRINCIPAL', 'COORDINATOR', 'ADMIN EXECUTIVE'],
      'CLASS-1&2': ['PRT', 'TGT', 'SUBJECT TEACHER'],
      'CLASSES-3,4&5': ['PRT', 'TGT', 'SUBJECT TEACHER', 'CLASS TEACHER']
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

  // 5 sets of question papers
  const [questionPdfFiles, setQuestionPdfFiles] = useState<(File | null)[]>([null, null, null, null, null]);
  const [extractedQuestionsSets, setExtractedQuestionsSets] = useState<any[][]>([[], [], [], [], []]);
  
  const [answerPdfFile, setAnswerPdfFile] = useState<File | null>(null);
  const [solutionPdfFile, setSolutionPdfFile] = useState<File | null>(null);
  const [extractedAnswers, setExtractedAnswers] = useState<any[]>([]);
  const [extractedSolutions, setExtractedSolutions] = useState<any[]>([]);

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

  const handleQuestionPdfChange = (setIndex: number) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQuestionPdfFiles(prev => {
        const newFiles = [...prev];
        newFiles[setIndex] = file;
        return newFiles;
      });
      setExtractedQuestionsSets(prev => {
        const newSets = [...prev];
        newSets[setIndex] = [];
        return newSets;
      });
    }
  };

  const handleAnswerPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnswerPdfFile(file);
      setExtractedAnswers([]);
    }
  };

  const handleSolutionPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSolutionPdfFile(file);
      setExtractedSolutions([]);
    }
  };

  const parseSolutionPdf = async () => {
    if (!solutionPdfFile) {
      toast.error('Please select a solutions PDF first');
      return;
    }

    setIsParsing(true);
    try {
      const text = await solutionPdfFile.text();
      
      const { data, error } = await supabase.functions.invoke('parse-answer-key', {
        body: { pdfText: text, questionCount: extractedQuestionsSets.flat().length, isSolution: true }
      });

      if (error) throw error;
      
      if (data.answers && data.answers.length > 0) {
        setExtractedSolutions(data.answers);
        toast.success(`Extracted ${data.answers.length} solutions`);
      } else {
        toast.warning('No solutions found in the PDF. Please check the format.');
      }
    } catch (error) {
      console.error('Error parsing solutions PDF:', error);
      toast.error('Failed to parse solutions PDF');
    } finally {
      setIsParsing(false);
    }
  };

  const parseQuestionPdf = (setIndex: number) => async () => {
    const questionPdfFile = questionPdfFiles[setIndex];
    if (!questionPdfFile) {
      toast.error(`Please select a question PDF for Set ${setIndex + 1} first`);
      return;
    }

    setIsParsing(true);
    try {
      // For PDFs, convert to base64 for proper text extraction on the server
      // For .txt files, send as text directly
      const isPdf = questionPdfFile.name.toLowerCase().endsWith('.pdf');
      let payload: { pdfText?: string; pdfBase64?: string; paperType: string; language: string } = {
        paperType: newPaper.stage_type,
        language: 'auto'
      };

      if (isPdf) {
        // Convert PDF to base64 for server-side extraction
        const arrayBuffer = await questionPdfFile.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        payload.pdfBase64 = base64;
        console.log(`Set ${setIndex + 1}: Sending PDF as base64 (${base64.length} chars)`);
      } else {
        // For text files, read as text directly
        const text = await questionPdfFile.text();
        payload.pdfText = text;
        console.log(`Set ${setIndex + 1}: Sending text file (${text.length} chars)`);
      }
      
      const { data, error } = await supabase.functions.invoke('parse-question-paper', {
        body: payload
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      console.log(`Set ${setIndex + 1}: Response received:`, data);
      
      if (data.error) {
        toast.error(`Set ${setIndex + 1}: ${data.error}`);
        return;
      }
      
      if (data.questions && data.questions.length > 0) {
        setExtractedQuestionsSets(prev => {
          const newSets = [...prev];
          newSets[setIndex] = data.questions;
          return newSets;
        });
        toast.success(`Set ${setIndex + 1}: Extracted ${data.questions.length} questions`);
      } else {
        toast.warning(`Set ${setIndex + 1}: No questions found in the document.`);
      }
    } catch (error) {
      console.error('Error parsing question PDF:', error);
      toast.error(`Set ${setIndex + 1}: Failed to parse document. Please try again.`);
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
        body: { pdfText: text, questionCount: extractedQuestionsSets.flat().length }
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
    if (!newPaper.segment) {
      toast.error('Please select a segment');
      return;
    }
    if (!newPaper.category) {
      toast.error('Please select a category');
      return;
    }
    if (!newPaper.designation) {
      toast.error('Please select a designation');
      return;
    }
    
    // Check if at least one set has a file and extracted questions
    const validSets = questionPdfFiles.map((file, index) => ({
      file,
      questions: extractedQuestionsSets[index],
      setNumber: index + 1
    })).filter(set => set.file && set.questions.length > 0);
    
    if (validSets.length === 0) {
      toast.error('Please upload and extract at least one question paper');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Save each valid set as a separate paper
      for (const set of validSets) {
        // Upload question PDF to storage
        let pdfUrl = '';
        if (set.file) {
          const fileName = `${Date.now()}-set${set.setNumber}-${set.file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(`question-papers/${fileName}`, set.file);

          if (uploadError) throw uploadError;
          
          const { data: urlData } = supabase.storage
            .from('resumes')
            .getPublicUrl(`question-papers/${fileName}`);
          pdfUrl = urlData.publicUrl;
        }

        // Auto-generate title from segment, category, designation, and set number
        const autoTitle = `${newPaper.segment} - ${newPaper.category} - ${newPaper.designation} - Set ${set.setNumber}`;

        const { data: paperData, error: paperError } = await supabase
          .from('interview_question_papers')
          .insert({
            title: autoTitle,
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

        const questionsToInsert = set.questions.map((q: any, index: number) => ({
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

        if (extractedAnswers.length > 0 && insertedQuestions) {
          const answerKeysToInsert = extractedAnswers.map(a => {
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

        // Insert solutions if available
        if (extractedSolutions.length > 0 && insertedQuestions) {
          const solutionsToInsert = extractedSolutions.map(s => {
            const matchingQuestion = insertedQuestions.find(
              q => q.question_number === s.question_number
            );
            if (!matchingQuestion) return null;

            return {
              question_id: matchingQuestion.id,
              solution_text: s.solution_text || s.answer_text || '',
              step_by_step: s.step_by_step || [],
              explanation: s.explanation || null
            };
          }).filter(Boolean);

          if (solutionsToInsert.length > 0) {
            const { error: solutionsError } = await supabase
              .from('interview_solutions')
              .insert(solutionsToInsert);

            if (solutionsError) {
              console.error('Error inserting solutions:', solutionsError);
            }
          }
        }
      }

      toast.success(`${validSets.length} question paper(s) saved successfully!`);
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
    setQuestionPdfFiles([null, null, null, null, null]);
    setAnswerPdfFile(null);
    setSolutionPdfFile(null);
    setExtractedQuestionsSets([[], [], [], [], []]);
    setExtractedAnswers([]);
    setExtractedSolutions([]);
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

  // Group papers by segment > category
  const getPapersGroupedByCategory = () => {
    const grouped: Record<string, Record<string, QuestionPaper[]>> = {};
    
    papers.forEach(paper => {
      const segment = paper.segment || 'Unassigned';
      const category = paper.category || 'General';
      
      if (!grouped[segment]) {
        grouped[segment] = {};
      }
      if (!grouped[segment][category]) {
        grouped[segment][category] = [];
      }
      grouped[segment][category].push(paper);
    });
    
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const groupedPapers = getPapersGroupedByCategory();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Add Question Paper Form - Directly on page */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Question Paper
            </CardTitle>
            <CardDescription>
              Select role assignment, upload question paper and answer key PDFs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role Selection Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Segment *</Label>
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
                <Label>Category *</Label>
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
                <Label>Designation *</Label>
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

            {/* File Upload Section - 5 Question Paper Sets */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <BookOpen className="h-5 w-5" />
                Question Papers (5 Sets) *
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {[0, 1, 2, 3, 4].map((setIndex) => (
                  <div key={setIndex} className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <Label className="text-sm font-medium">Set {setIndex + 1}</Label>
                    <Input 
                      type="file" 
                      accept=".pdf,.txt"
                      onChange={handleQuestionPdfChange(setIndex)}
                      className="text-xs"
                    />
                    <Button 
                      onClick={parseQuestionPdf(setIndex)} 
                      disabled={!questionPdfFiles[setIndex] || isParsing}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      {isParsing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Extract
                    </Button>
                    {extractedQuestionsSets[setIndex]?.length > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded p-1.5 text-xs">
                        <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{extractedQuestionsSets[setIndex].length} Qs</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted Questions Preview */}
            {extractedQuestionsSets.some(set => set.length > 0) && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Extracted Questions Preview
                </Label>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {extractedQuestionsSets.map((questions, setIndex) => (
                    questions.length > 0 && (
                      <div key={setIndex} className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Set {setIndex + 1} ({questions.length} questions)</h4>
                        <div className="grid gap-2">
                          {questions.slice(0, 5).map((q: any, qIndex: number) => (
                            <div key={qIndex} className="bg-background border rounded p-2 text-sm">
                              <span className="font-medium text-primary">Q{q.question_number || qIndex + 1}:</span>{' '}
                              <span className="text-foreground">{q.question_text?.substring(0, 150)}{q.question_text?.length > 150 ? '...' : ''}</span>
                            </div>
                          ))}
                          {questions.length > 5 && (
                            <p className="text-xs text-muted-foreground italic">+ {questions.length - 5} more questions...</p>
                          )}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Answer Key and Solutions Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Answer Key Upload */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Answer Key
                </Label>
                <div className="flex gap-2">
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
                    size="sm"
                  >
                    {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1">Extract</span>
                  </Button>
                </div>
                {extractedAnswers.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-sm">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{extractedAnswers.length} answers extracted</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Solutions Upload */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Solutions
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="file" 
                    accept=".pdf,.txt"
                    onChange={handleSolutionPdfChange}
                    className="flex-1"
                  />
                  <Button 
                    onClick={parseSolutionPdf} 
                    disabled={!solutionPdfFile || isParsing}
                    variant="secondary"
                    size="sm"
                  >
                    {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1">Extract</span>
                  </Button>
                </div>
                {extractedSolutions.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-sm">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{extractedSolutions.length} solutions extracted</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
              <Button 
                onClick={() => {
                  console.log('Save button clicked');
                  console.log('newPaper:', newPaper);
                  console.log('extractedQuestionsSets:', extractedQuestionsSets);
                  console.log('Has questions:', extractedQuestionsSets.some(set => set.length > 0));
                  savePaperWithQuestionsAndAnswers();
                }}
                disabled={isUploading || !newPaper.segment || !newPaper.category || !newPaper.designation || !extractedQuestionsSets.some(set => set.length > 0)}
              >
                {isUploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Question Paper
                {extractedQuestionsSets.some(set => set.length > 0) && (
                  <span className="ml-1 text-xs opacity-75">
                    ({extractedQuestionsSets.filter(set => set.length > 0).length} sets)
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Category-wise Uploaded Papers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Uploaded Question Papers
            </CardTitle>
            <CardDescription>{papers.length} papers uploaded - organized by segment and category</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedPapers).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No question papers yet</p>
                <p className="text-sm">Use the form above to add your first paper</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {Object.entries(groupedPapers).map(([segment, categories]) => (
                  <AccordionItem key={segment} value={segment}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {segment}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ({Object.values(categories).flat().length} papers)
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4 space-y-4">
                        {Object.entries(categories).map(([category, categoryPapers]) => (
                          <div key={category} className="space-y-2">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              <Badge variant="outline">{category}</Badge>
                              <span className="text-muted-foreground">({categoryPapers.length})</span>
                            </h4>
                            <div className="grid gap-2 pl-4">
                              {categoryPapers.map(paper => (
                                <div
                                  key={paper.id}
                                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                    selectedPaper?.id === paper.id 
                                      ? 'bg-primary/10 border-primary' 
                                      : 'hover:bg-muted'
                                  }`}
                                  onClick={() => setSelectedPaper(paper)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{paper.designation || paper.title}</span>
                                        <Badge variant={paper.is_active ? "default" : "secondary"} className="text-xs">
                                          {paper.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {getStageLabel(paper.stage_type)} • Created: {new Date(paper.created_at).toLocaleDateString()}
                                      </p>
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
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Selected Paper Details */}
        {selectedPaper && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {selectedPaper.title}
              </CardTitle>
              <CardDescription>
                {questions.length} questions • {getStageLabel(selectedPaper.stage_type)}
                {selectedPaper.segment && ` • ${selectedPaper.segment}`}
                {selectedPaper.category && ` • ${selectedPaper.category}`}
                {selectedPaper.designation && ` • ${selectedPaper.designation}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="questions">Questions</TabsTrigger>
                  <TabsTrigger value="answers">Answer Keys</TabsTrigger>
                </TabsList>
                
                <TabsContent value="questions">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {questions.map((q) => (
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
                                    {q.options.map((opt: string, i: number) => (
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
                  <ScrollArea className="h-[400px]">
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
                              <TableCell className="max-w-xs">
                                {answer ? (
                                  <p className="truncate">{answer.answer_text}</p>
                                ) : (
                                  <span className="text-muted-foreground italic">No answer key</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {answer?.keywords?.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {answer.keywords.slice(0, 3).map((kw, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                                    ))}
                                    {answer.keywords.length > 3 && (
                                      <Badge variant="outline" className="text-xs">+{answer.keywords.length - 3}</Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {answer ? `${answer.min_keyword_match_percent}%` : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {questions.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        No questions to display
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
