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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  ArrowLeft, Upload, FileText, Plus, Trash2, Eye, 
  Loader2, CheckCircle2, XCircle, BookOpen, Key, RefreshCw,
  ChevronDown, FolderOpen, Play, Clock, User, ChevronRight, PenLine
} from "lucide-react";
import { toast } from "sonner";
import ManualQuestionCreator, { ManualQuestion } from "@/components/admin/ManualQuestionCreator";

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
  const [createMode, setCreateMode] = useState<'pdf' | 'manual'>('pdf');
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([]);
  
  // Preview modal states
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState<Record<number, number>>({});
  
  // Form states
  const [newPaper, setNewPaper] = useState({
    title: '',
    description: '',
    stage_type: 'all' as string,
    segment: '',
    category: '',
    classLevel: '',
    designation: '',
  });

  // Role-based options
  const segmentOptions = ['Pre-Primary', 'Primary', 'High School'];

  const categoryOptions: Record<string, string[]> = {
    'Pre-Primary': ['Teaching', 'Helping/Supporting', 'Admin'],
    'Primary': ['Teaching', 'Helping/Supporting', 'Admin', 'CLASS-1&2', 'CLASSES-3,4&5'],
    'High School': ['Board', 'Compititive'],
  };

  // Class options for High School > Board/Competitive
  const classLevelOptions: Record<string, string[]> = {
    'Board': ['CLASS-6,7&8', 'CLASS-9&10'],
    'Compititive': ['CLASSES-6,7&8', 'CLASSES-9&10'],
  };

  // Subject designations based on class level
  const classDesignationOptions: Record<string, string[]> = {
    'CLASS-6,7&8': ['Telugu', 'Hindi', 'English', 'Maths', 'Physics', 'Chemistry', 'Biology'],
    'CLASS-9&10': [
      'Telugu', 'Hindi', 'English', 'Maths', 'Physics', 'Chemistry', 
      'Biology', 'Botany', 'Zoology', 'Social', 'Mental Ability', 'Counsellor', 
      'Academic Dean', 'Computers', 'Physical Education', 'Principal', 
      'Soft Skills Trainer', 'French'
    ],
    'CLASSES-6,7&8': [
      'Maths', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 
      'Mental Ability', 'Counsellor'
    ],
    'CLASSES-9&10': [
      'Maths', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 
      'Mental Ability', 'Counsellor', 'Academic Dean'
    ],
  };

  const designationOptions: Record<string, Record<string, string[]>> = {
    'Pre-Primary': {
      'Teaching': ['MOTHER TEACHER'],
      'Helping/Supporting': ['ASSO.TEACHER', 'CARE TAKER'],
      'Admin': ['VICE PRINCIPAL']
    },
    'Primary': {
      'Teaching': ['PRT', 'TGT', 'ASSO.TEACHER'],
      'Helping/Supporting': ['ASSO.TEACHER'],
      'Admin': ['VICE PRINCIPAL'],
      'CLASS-1&2': ['PRT', 'TGT', 'SUBJECT TEACHER'],
      'CLASSES-3,4&5': ['1st Language', '2nd Language', '3rd Language', 'MATHS', 'GEN.SCIENCE', 'SOCIAL', 'COMPUTERS', 'PHYSICAL EDUCATION', 'CCA']
    },
    'High School': {
      'Compititive': ['TGT', 'PGT', 'SENIOR TEACHER', 'HOD']
    }
  };

  // Check if we need to show class level field (for Board or Compititive)
  const showClassLevel = newPaper.segment === 'High School' && (newPaper.category === 'Board' || newPaper.category === 'Compititive');

  const getCurrentClassLevels = () => {
    if (!showClassLevel) return [];
    return classLevelOptions[newPaper.category] || [];
  };

  const getCurrentCategories = () => {
    return newPaper.segment ? categoryOptions[newPaper.segment] || [] : [];
  };

  const getCurrentDesignations = () => {
    if (!newPaper.segment || !newPaper.category) return [];
    
    // For High School + Board or Compititive, use class-based designations
    if (newPaper.segment === 'High School' && (newPaper.category === 'Board' || newPaper.category === 'Compititive')) {
      if (!newPaper.classLevel) return [];
      return classDesignationOptions[newPaper.classLevel] || [];
    }
    
    return designationOptions[newPaper.segment]?.[newPaper.category] || [];
  };

  // Open preview modal for a paper
  const openPreview = async (paper: QuestionPaper) => {
    try {
      const { data: paperQuestions, error } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('paper_id', paper.id)
        .order('display_order');
      
      if (error) throw error;
      
      setPreviewPaper(paper);
      setPreviewQuestions(paperQuestions || []);
      setCurrentQuestionIndex(0);
      setPreviewAnswers({});
      setShowPreview(true);
    } catch (error) {
      console.error('Error loading preview questions:', error);
      toast.error('Failed to load questions for preview');
    }
  };

  const handlePreviewAnswer = (questionIndex: number, optionIndex: number) => {
    setPreviewAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const nextPreviewQuestion = () => {
    if (currentQuestionIndex < previewQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevPreviewQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
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

        // Auto-generate title including class level if applicable
        const classInfo = newPaper.classLevel ? ` - ${newPaper.classLevel}` : '';
        const autoTitleWithClass = `${newPaper.segment} - ${newPaper.category}${classInfo} - ${newPaper.designation} - Set ${set.setNumber}`;

        const { data: paperData, error: paperError } = await supabase
          .from('interview_question_papers')
          .insert({
            title: autoTitleWithClass,
            description: newPaper.description || null,
            stage_type: newPaper.stage_type,
            pdf_url: pdfUrl || 'manual-entry',
            created_by: user?.id,
            segment: newPaper.segment || null,
            category: newPaper.category || null,
            class_level: newPaper.classLevel || null,
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
    setNewPaper({ title: '', description: '', stage_type: 'all', segment: '', category: '', classLevel: '', designation: '' });
    setQuestionPdfFiles([null, null, null, null, null]);
    setAnswerPdfFile(null);
    setSolutionPdfFile(null);
    setExtractedQuestionsSets([[], [], [], [], []]);
    setExtractedAnswers([]);
    setExtractedSolutions([]);
    setManualQuestions([]);
    setCreateMode('pdf');
  };

  // Save manual questions
  const saveManualQuestions = async () => {
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
    if (manualQuestions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Auto-generate title including class level if applicable
      const classInfo = newPaper.classLevel ? ` - ${newPaper.classLevel}` : '';
      const autoTitle = `${newPaper.segment} - ${newPaper.category}${classInfo} - ${newPaper.designation} - Manual`;

      const { data: paperData, error: paperError } = await supabase
        .from('interview_question_papers')
        .insert({
          title: autoTitle,
          description: newPaper.description || null,
          stage_type: newPaper.stage_type,
          pdf_url: 'manual-entry',
          created_by: user?.id,
          segment: newPaper.segment || null,
          category: newPaper.category || null,
          class_level: newPaper.classLevel || null,
          designation: newPaper.designation || null
        })
        .select()
        .single();

      if (paperError) throw paperError;

      // Insert questions
      const questionsToInsert = manualQuestions.map((q, index) => ({
        paper_id: paperData.id,
        question_number: q.question_number,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === 'mcq' ? q.options : null,
        marks: q.marks,
        display_order: index
      }));

      const { data: insertedQuestions, error: questionsError } = await supabase
        .from('interview_questions')
        .insert(questionsToInsert)
        .select();

      if (questionsError) throw questionsError;

      // Insert answer keys for MCQ questions
      if (insertedQuestions) {
        const answerKeysToInsert = manualQuestions
          .map((q, index) => {
            const insertedQ = insertedQuestions[index];
            if (!insertedQ) return null;

            if (q.question_type === 'mcq' && q.correct_answer_index !== undefined) {
              return {
                question_id: insertedQ.id,
                answer_text: q.options[q.correct_answer_index] || '',
                keywords: [q.options[q.correct_answer_index] || ''],
                is_case_sensitive: false,
                min_keyword_match_percent: 100
              };
            } else if (q.question_type === 'text' && q.correct_answer_text) {
              return {
                question_id: insertedQ.id,
                answer_text: q.correct_answer_text,
                keywords: q.correct_answer_text.split(/[,\s]+/).filter((k: string) => k.length > 2),
                is_case_sensitive: false,
                min_keyword_match_percent: 50
              };
            }
            return null;
          })
          .filter(Boolean);

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
      resetForm();
      loadPapers();
    } catch (error) {
      console.error('Error saving paper:', error);
      toast.error('Failed to save question paper');
    } finally {
      setIsUploading(false);
    }
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
              Select role assignment, then upload PDFs or create questions manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role Selection Fields */}
            <div className={`grid grid-cols-1 gap-4 ${showClassLevel ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              <div className="space-y-2">
                <Label>Segment *</Label>
                <Select 
                  value={newPaper.segment} 
                  onValueChange={(v) => setNewPaper(p => ({ ...p, segment: v, category: '', classLevel: '', designation: '' }))}
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
                  onValueChange={(v) => setNewPaper(p => ({ ...p, category: v, classLevel: '', designation: '' }))}
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
              {showClassLevel && (
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <Select 
                    value={newPaper.classLevel} 
                    onValueChange={(v) => setNewPaper(p => ({ ...p, classLevel: v, designation: '' }))}
                    disabled={!newPaper.category}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCurrentClassLevels().map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Select 
                  value={newPaper.designation} 
                  onValueChange={(v) => setNewPaper(p => ({ ...p, designation: v }))}
                  disabled={showClassLevel ? !newPaper.classLevel : !newPaper.category}
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

            {/* Creation Mode Tabs */}
            <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as 'pdf' | 'manual')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="pdf" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload PDF
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <PenLine className="h-4 w-4" />
                  Create Manually
                </TabsTrigger>
              </TabsList>

              {/* PDF Upload Mode */}
              <TabsContent value="pdf" className="space-y-6 mt-6">
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

                {/* PDF Mode Save Button */}
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
              </TabsContent>

              {/* Manual Creation Mode */}
              <TabsContent value="manual" className="space-y-6 mt-6">
                <ManualQuestionCreator 
                  questions={manualQuestions}
                  onQuestionsChange={setManualQuestions}
                />

                {/* Manual Mode Save Button */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={resetForm}>
                    Reset
                  </Button>
                  <Button 
                    onClick={saveManualQuestions}
                    disabled={isUploading || !newPaper.segment || !newPaper.category || !newPaper.designation || manualQuestions.length === 0}
                  >
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Question Paper
                    {manualQuestions.length > 0 && (
                      <span className="ml-1 text-xs opacity-75">
                        ({manualQuestions.length} questions)
                      </span>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
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
                                        className="h-7 w-7 text-blue-600"
                                        onClick={(e) => { e.stopPropagation(); openPreview(paper); }}
                                        title="Preview as Candidate"
                                      >
                                        <Play className="h-3.5 w-3.5" />
                                      </Button>
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

      {/* Candidate Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidate View Preview
            </DialogTitle>
            <DialogDescription>
              This is how candidates will see the questions during their interview
            </DialogDescription>
          </DialogHeader>

          {previewPaper && previewQuestions.length > 0 && (
            <div className="flex-1 overflow-hidden">
              {/* Interview Header */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{previewPaper.segment} - {previewPaper.category}</h3>
                    <p className="text-sm text-muted-foreground">{previewPaper.designation}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>90 sec/question</span>
                    </div>
                    <Badge variant="secondary">
                      Question {currentQuestionIndex + 1} of {previewQuestions.length}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={((currentQuestionIndex + 1) / previewQuestions.length) * 100} 
                  className="mt-3 h-2"
                />
              </div>

              {/* Current Question */}
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                        {currentQuestionIndex + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-medium leading-relaxed">
                          {previewQuestions[currentQuestionIndex]?.question_text}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {previewQuestions[currentQuestionIndex]?.question_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {previewQuestions[currentQuestionIndex]?.marks || 1} mark(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Options */}
                    {previewQuestions[currentQuestionIndex]?.options && (
                      <RadioGroup 
                        value={previewAnswers[currentQuestionIndex]?.toString() || ""}
                        onValueChange={(val) => handlePreviewAnswer(currentQuestionIndex, parseInt(val))}
                        className="space-y-3"
                      >
                        {(Array.isArray(previewQuestions[currentQuestionIndex].options) 
                          ? previewQuestions[currentQuestionIndex].options 
                          : previewQuestions[currentQuestionIndex].options?.options || []
                        ).map((option: string, idx: number) => (
                          <div
                            key={idx}
                            className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                              previewAnswers[currentQuestionIndex] === idx
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                            onClick={() => handlePreviewAnswer(currentQuestionIndex, idx)}
                          >
                            <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                            <Label 
                              htmlFor={`option-${idx}`} 
                              className="flex-1 cursor-pointer font-normal"
                            >
                              <span className="font-semibold mr-2">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={prevPreviewQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {previewQuestions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                        idx === currentQuestionIndex
                          ? 'bg-primary text-primary-foreground'
                          : previewAnswers[idx] !== undefined
                          ? 'bg-green-500 text-white'
                          : 'bg-muted hover:bg-muted-foreground/20'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={nextPreviewQuestion}
                  disabled={currentQuestionIndex === previewQuestions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {/* Summary */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>
                    Answered: {Object.keys(previewAnswers).length} / {previewQuestions.length}
                  </span>
                  <Button variant="link" size="sm" onClick={() => setShowPreview(false)}>
                    Close Preview
                  </Button>
                </div>
              </div>
            </div>
          )}

          {previewQuestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No questions found in this paper</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
