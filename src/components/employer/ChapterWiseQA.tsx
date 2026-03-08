import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Upload, Loader2, Plus, Trash2, Sparkles, FileText,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjsLib from "pdfjs-dist";
import { toast } from "sonner";

interface SectionConfig {
  id: string;
  name: string;
  marksPerQuestion: number;
  questionCount: number;
  questionType: "mcq" | "short_answer" | "long_answer" | "fill_in_the_blanks" | "match_the_following" | "assertion_reasoning";
  difficulty: "easy" | "medium" | "hard";
}

interface Chapter {
  id: number;
  title: string;
  summary: string;
}

interface ChapterWiseQAProps {
  jobId: string;
  jobTitle: string;
}

export const ChapterWiseQA = ({ jobId, jobTitle }: ChapterWiseQAProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [sections, setSections] = useState<SectionConfig[]>([
    { id: "1", name: "A", marksPerQuestion: 10, questionCount: 3, questionType: "long_answer", difficulty: "medium" },
    { id: "2", name: "B", marksPerQuestion: 5, questionCount: 5, questionType: "short_answer", difficulty: "medium" },
    { id: "3", name: "C", marksPerQuestion: 1, questionCount: 10, questionType: "mcq", difficulty: "easy" },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any>(null);
  const [paperId, setPaperId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showAnswers, setShowAnswers] = useState(true);
  const [paperTotalMarks, setPaperTotalMarks] = useState<number>(100);

  const totalMarks = sections.reduce((sum, s) => sum + (s.marksPerQuestion * s.questionCount), 0);
  const totalQuestions = sections.reduce((sum, s) => sum + s.questionCount, 0);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setPdfFile(file);
    setChapters([]);
    setSelectedChapters([]);
    setGeneratedQuestions(null);

    // Extract actual text from PDF using pdfjs-dist
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += `\n--- Page ${i} ---\n${pageText}`;
      }
      
      if (fullText.trim().length < 50) {
        toast.error("Could not extract text from this PDF. It may be scanned/image-based.");
        return;
      }
      
      setPdfText(fullText);
      toast.success(`PDF "${file.name}" uploaded — ${pdf.numPages} pages extracted`);
    } catch (err) {
      console.error("PDF extraction error:", err);
      toast.error("Failed to extract text from PDF");
    }
  };

  const handleExtractChapters = async () => {
    if (!pdfText) {
      toast.error("Please upload a PDF first");
      return;
    }

    setIsExtracting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create paper record
      let currentPaperId = paperId;
      if (!currentPaperId) {
        const { data: paper, error } = await supabase
          .from("chapter_wise_papers" as any)
          .insert({
            job_id: jobId,
            employer_id: user.id,
            title: `Chapter-wise Q&A - ${jobTitle}`,
            status: "draft",
          })
          .select()
          .single();
        
        if (error) throw error;
        currentPaperId = (paper as any).id;
        setPaperId(currentPaperId);
      }

      const { data, error } = await supabase.functions.invoke("generate-chapter-questions", {
        body: {
          action: "extract-chapters",
          paperId: currentPaperId,
          pdfText: pdfText.substring(0, 50000), // Limit size
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setChapters(data.chapters || []);
      setSelectedChapters(data.chapters?.map((c: Chapter) => c.id) || []);
      toast.success(`${data.chapters?.length || 0} chapters detected!`);
    } catch (err: any) {
      console.error("Error extracting chapters:", err);
      toast.error(err.message || "Failed to extract chapters");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddSection = () => {
    const nextName = String.fromCharCode(65 + sections.length);
    if (sections.length >= 8) {
      toast.error("Maximum 8 sections allowed");
      return;
    }
    setSections([...sections, {
      id: Date.now().toString(),
      name: nextName,
      marksPerQuestion: 2,
      questionCount: 5,
      questionType: "short_answer",
      difficulty: "medium",
    }]);
  };

  const handleRemoveSection = (id: string) => {
    if (sections.length <= 1) {
      toast.error("At least one section is required");
      return;
    }
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id: string, field: keyof SectionConfig, value: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleGenerateQuestions = async () => {
    if (chapters.length > 0 && selectedChapters.length === 0) {
      toast.error("Please select at least one chapter");
      return;
    }

    setIsGenerating(true);
    try {
      const selected = chapters.filter(c => selectedChapters.includes(c.id));

      const { data, error } = await supabase.functions.invoke("generate-chapter-questions", {
        body: {
          action: "generate-questions",
          paperId,
          pdfText: pdfText.substring(0, 50000),
          sectionsConfig: sections,
          selectedChapters: selected,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedQuestions(data.questions);
      setShowPreview(true);
      toast.success(`Generated ${data.totalQuestions} questions (${data.totalMarks} marks total)!`);
    } catch (err: any) {
      console.error("Error generating questions:", err);
      toast.error(err.message || "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleChapter = (chapterId: number) => {
    setSelectedChapters(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  return (
    <Card className={`border-2 transition-colors ${isExpanded ? "border-primary/40 bg-primary/5" : "border-dashed border-muted-foreground/30"}`}>
      <CardContent className="py-4 px-5">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Chapter-wise Questions & Answers
              </p>
              <p className="text-xs text-muted-foreground">
                Upload a book PDF → AI detects chapters → Configure sections → Generate Q&A
              </p>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>

        {isExpanded && (
          <div className="mt-5 space-y-5">
            {/* Step 1: Upload PDF */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-bold">Step 1</Badge>
                <Label className="text-sm font-semibold">Upload Book / Chapter PDF</Label>
              </div>
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="chapter-pdf-upload"
                />
                <label htmlFor="chapter-pdf-upload" className="cursor-pointer">
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-primary">{pdfFile.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                      </Badge>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Click to upload PDF</p>
                      <p className="text-xs text-muted-foreground/70">Supported: PDF files up to 20MB</p>
                    </div>
                  )}
                </label>
              </div>
              {pdfFile && !chapters.length && (
                <Button
                  onClick={handleExtractChapters}
                  disabled={isExtracting}
                  className="w-full"
                  size="sm"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      AI is detecting chapters...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Detect Chapters with AI
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Step 2: Select Chapters */}
            {chapters.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold">Step 2</Badge>
                    <Label className="text-sm font-semibold">Select Chapters ({selectedChapters.length}/{chapters.length})</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => setSelectedChapters(
                      selectedChapters.length === chapters.length ? [] : chapters.map(c => c.id)
                    )}
                  >
                    {selectedChapters.length === chapters.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedChapters.includes(chapter.id)
                          ? "bg-primary/5 border-primary/30"
                          : "bg-background border-border hover:border-muted-foreground/40"
                      }`}
                      onClick={() => toggleChapter(chapter.id)}
                    >
                      <Checkbox
                        checked={selectedChapters.includes(chapter.id)}
                        onCheckedChange={() => toggleChapter(chapter.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{chapter.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{chapter.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Marks Input */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${totalMarks !== paperTotalMarks ? "border-destructive bg-destructive/5" : "bg-muted/30"}`}>
              <Label className="text-sm font-semibold whitespace-nowrap">Total Marks for Paper:</Label>
              <Input
                type="number"
                min={1}
                value={paperTotalMarks}
                onChange={(e) => {
                  const newTotal = parseInt(e.target.value) || 0;
                  setPaperTotalMarks(newTotal);
                  if (newTotal > 0 && sections.length > 0) {
                    const currentTotal = sections.reduce((sum, s) => sum + (s.marksPerQuestion * s.questionCount), 0);
                    if (currentTotal > 0) {
                      let remaining = newTotal;
                      const updated = sections.map((s, idx) => {
                        const currentSectionMarks = s.marksPerQuestion * s.questionCount;
                        const proportion = currentSectionMarks / currentTotal;
                        const newSectionMarks = idx === sections.length - 1
                          ? remaining
                          : Math.round(newTotal * proportion);
                        remaining -= newSectionMarks;
                        const newMarksPerQ = Math.max(1, Math.round(newSectionMarks / s.questionCount));
                        return { ...s, marksPerQuestion: newMarksPerQ };
                      });
                      setSections(updated);
                    }
                  }
                }}
                className="h-8 w-28 text-sm font-bold"
              />
              {totalMarks !== paperTotalMarks && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[10px]">
                    Section total: {totalMarks} ≠ {paperTotalMarks}
                  </Badge>
                  <p className="text-[10px] text-destructive font-medium">
                    Adjust sections to match {paperTotalMarks} marks
                  </p>
                </div>
              )}
              {totalMarks === paperTotalMarks && (
                <Badge className="text-[10px] bg-green-600">✓ Matched</Badge>
              )}
            </div>

            {/* Step 3: Configure Sections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-bold">Step 3</Badge>
                  <Label className="text-sm font-semibold">Configure Sections</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px]">{totalQuestions} Qs • {totalMarks} Marks</Badge>
                  <Button variant="outline" size="sm" className="text-xs h-6" onClick={handleAddSection}>
                    <Plus className="h-3 w-3 mr-1" /> Add Section
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {sections.map((section) => (
                  <Card key={section.id} className="border">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                          {section.name}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Section Name</Label>
                              <Input
                                value={section.name}
                                onChange={(e) => updateSection(section.id, "name", e.target.value)}
                                className="h-7 text-xs"
                                maxLength={2}
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Marks / Question</Label>
                              <Input
                                type="number"
                                min={1}
                                value={section.marksPerQuestion || ""}
                                onChange={(e) => updateSection(section.id, "marksPerQuestion", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                                onBlur={(e) => { if (!e.target.value || parseInt(e.target.value) < 1) updateSection(section.id, "marksPerQuestion", 1); }}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">No. of Questions</Label>
                              <Input
                                type="number"
                                min={1}
                                max={50}
                                value={section.questionCount}
                                onChange={(e) => updateSection(section.id, "questionCount", parseInt(e.target.value) || 1)}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Question Type</Label>
                              <Select
                                value={section.questionType}
                                onValueChange={(v) => updateSection(section.id, "questionType", v)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="long_answer">Long Answer</SelectItem>
                                  <SelectItem value="short_answer">Short Answer</SelectItem>
                                  <SelectItem value="mcq">MCQ</SelectItem>
                                  <SelectItem value="fill_in_the_blanks">Fill in the Blanks</SelectItem>
                                  <SelectItem value="match_the_following">Match the Following</SelectItem>
                                  <SelectItem value="assertion_reasoning">Assertion & Reasoning</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Difficulty</Label>
                              <Select
                                value={section.difficulty}
                                onValueChange={(v) => updateSection(section.id, "difficulty", v)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="secondary" className="text-[10px]">
                            {section.marksPerQuestion * section.questionCount} marks
                          </Badge>
                          {sections.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => handleRemoveSection(section.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

              {/* Paper Layout Preview */}
              <Card className="border border-primary/20 bg-primary/5">
                <CardHeader className="py-2.5 px-4 border-b border-primary/15">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      Paper Layout Preview
                    </CardTitle>
                    <Badge className="text-[10px]">{totalQuestions} Qs • {totalMarks} Marks</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {sections.map((section, idx) => (
                    <div key={section.id} className={`p-3 rounded-lg border ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            {section.name}
                          </div>
                          <div>
                            <p className="text-xs font-semibold">Section {section.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {section.questionCount} × {section.marksPerQuestion} marks = {section.questionCount * section.marksPerQuestion} marks
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {section.questionType === "mcq" ? "MCQ" : section.questionType === "short_answer" ? "Short Answer" : section.questionType === "fill_in_the_blanks" ? "Fill in the Blanks" : section.questionType === "match_the_following" ? "Match the Following" : section.questionType === "assertion_reasoning" ? "Assertion & Reasoning" : "Long Answer"}
                          </Badge>
                          <Badge className={`text-[10px] ${section.difficulty === "hard" ? "bg-destructive" : section.difficulty === "easy" ? "bg-green-600" : "bg-yellow-500"}`}>
                            {section.difficulty.charAt(0).toUpperCase() + section.difficulty.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      {/* Placeholder question slots */}
                      <div className="mt-2 space-y-1">
                        {Array.from({ length: Math.min(section.questionCount, 3) }).map((_, qIdx) => (
                          <div key={qIdx} className="flex items-center gap-2 text-[10px] text-muted-foreground pl-8">
                            <span className="font-mono">Q{qIdx + 1}.</span>
                            <div className="flex-1 h-3 bg-muted/50 rounded animate-pulse" />
                            <span className="text-[9px]">[{section.marksPerQuestion} mk]</span>
                          </div>
                        ))}
                        {section.questionCount > 3 && (
                          <p className="text-[9px] text-muted-foreground/60 pl-8 italic">
                            ... +{section.questionCount - 3} more questions
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t text-xs font-semibold text-foreground">
                    <span>Total Questions: {totalQuestions}</span>
                    <span>Total Marks: {totalMarks}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Generate Button */}
              {pdfFile && (
                <Button
                  onClick={handleGenerateQuestions}
                  disabled={isGenerating || totalMarks !== paperTotalMarks}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      AI is generating {totalQuestions} questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate {totalQuestions} Questions ({totalMarks} Marks)
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Preview Generated Questions - Always visible when generated */}
          {generatedQuestions && (
            <div className="space-y-3 mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  {showAnswers ? "Question Paper with Answer Key" : "Question Paper (Candidate View)"}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showAnswers ? "default" : "secondary"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAnswers(!showAnswers)}
                  >
                    {showAnswers ? "🔓 Hide Answers" : "🔒 Show Answers"}
                  </Button>
                </div>
              </div>
              {!showAnswers && (
                <div className="p-2 rounded-lg bg-accent/50 border border-accent text-xs text-accent-foreground flex items-center gap-2">
                  <span>👁️</span>
                  <span>Showing candidate view — answers are hidden. This is how candidates will see the paper.</span>
                </div>
              )}

              {generatedQuestions.sections?.map((section: any, sIdx: number) => (
                <Card key={sIdx} className="border-2 border-muted">
                  <CardHeader className="py-2.5 px-4 bg-muted/40 border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {section.name}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Section {section.name}</CardTitle>
                        <p className="text-[10px] text-muted-foreground">
                          {section.questions?.length} questions • {section.marks_per_question} marks each
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {section.questions?.map((q: any, qIdx: number) => (
                      <div key={qIdx} className={`p-3 rounded-lg border ${qIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">Q{q.id}</Badge>
                          <div className="flex-1 space-y-1.5">
                            <p className="text-xs font-medium leading-relaxed">{q.question}</p>
                            {q.chapter && (
                              <Badge variant="secondary" className="text-[9px]">📖 {q.chapter}</Badge>
                            )}
                            {q.type === "mcq" && q.options && (
                              <div className="grid grid-cols-2 gap-1 ml-1 mt-1">
                                {q.options.map((opt: string, oIdx: number) => (
                                  <div key={oIdx} className={`text-[10px] px-2 py-0.5 rounded border ${
                                    showAnswers && q.correct_option === String.fromCharCode(65 + oIdx)
                                      ? "bg-green-50 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-300 font-medium"
                                      : "bg-muted/30 border-border"
                                  }`}>
                                    {String.fromCharCode(65 + oIdx)}) {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === "fill_in_the_blanks" && (
                              <div className="mt-1 space-y-1">
                                <p className="text-[10px] text-muted-foreground italic">
                                  {q.sentence_with_blank || q.question}
                                </p>
                                {q.options && (
                                  <div className="flex flex-wrap gap-1 ml-1">
                                    {q.options.map((opt: string, oIdx: number) => (
                                      <span key={oIdx} className={`text-[10px] px-2 py-0.5 rounded border ${
                                        showAnswers && q.correct_option === String.fromCharCode(65 + oIdx)
                                          ? "bg-green-50 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-300 font-medium"
                                          : "bg-muted/30 border-border"
                                      }`}>
                                        {String.fromCharCode(65 + oIdx)}) {opt}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {q.type === "match_the_following" && q.column_a && q.column_b && (
                              <div className="mt-1 space-y-1">
                                <div className="grid grid-cols-2 gap-2 ml-1">
                                  <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">Column A</p>
                                    {q.column_a.map((item: string, i: number) => (
                                      <p key={i} className="text-[10px] py-0.5">{i + 1}. {item}</p>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">Column B</p>
                                    {q.column_b.map((item: string, i: number) => (
                                      <p key={i} className="text-[10px] py-0.5">{String.fromCharCode(65 + i)}. {item}</p>
                                    ))}
                                  </div>
                                </div>
                                {q.options && (
                                  <div className="flex flex-wrap gap-1 ml-1 mt-1">
                                    {q.options.map((opt: string, oIdx: number) => (
                                      <span key={oIdx} className={`text-[10px] px-2 py-0.5 rounded border ${
                                        showAnswers && q.correct_option === String.fromCharCode(65 + oIdx)
                                          ? "bg-green-50 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-300 font-medium"
                                          : "bg-muted/30 border-border"
                                      }`}>
                                        {String.fromCharCode(65 + oIdx)}) {opt}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {q.type === "assertion_reasoning" && (
                              <div className="mt-1 space-y-1 ml-1">
                                <p className="text-[10px]"><span className="font-semibold">Assertion (A):</span> {q.assertion}</p>
                                <p className="text-[10px]"><span className="font-semibold">Reason (R):</span> {q.reason}</p>
                                {q.options && (
                                  <div className="space-y-0.5 mt-1">
                                    {q.options.map((opt: string, oIdx: number) => (
                                      <div key={oIdx} className={`text-[10px] px-2 py-0.5 rounded border ${
                                        showAnswers && q.correct_option === String.fromCharCode(49 + oIdx)
                                          ? "bg-green-50 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-300 font-medium"
                                          : "bg-muted/30 border-border"
                                      }`}>
                                        ({oIdx + 1}) {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {showAnswers && (
                              <div className="p-2 bg-primary/5 rounded border border-primary/15 mt-1">
                                <p className="text-[10px] text-primary font-semibold">✅ Answer: {q.answer}</p>
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">{q.marks} mk</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
