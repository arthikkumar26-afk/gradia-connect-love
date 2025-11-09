import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, BookOpen, CheckCircle2, Code, MessageSquare, Video } from "lucide-react";
import { Link } from "react-router-dom";

const technicalQuestions = [
  {
    id: 1,
    question: "What is the difference between var, let, and const in JavaScript?",
    answer: "var is function-scoped, let and const are block-scoped. const cannot be reassigned after declaration.",
    difficulty: "Easy",
  },
  {
    id: 2,
    question: "Explain closures in JavaScript",
    answer: "A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned.",
    difficulty: "Medium",
  },
  {
    id: 3,
    question: "What is the time complexity of binary search?",
    answer: "O(log n) - Binary search divides the search space in half with each iteration.",
    difficulty: "Easy",
  },
];

const behavioralQuestions = [
  {
    id: 1,
    question: "Tell me about a time you faced a challenging problem at work",
    tips: "Use the STAR method: Situation, Task, Action, Result",
    difficulty: "Common",
  },
  {
    id: 2,
    question: "How do you handle disagreements with team members?",
    tips: "Focus on communication, collaboration, and finding win-win solutions",
    difficulty: "Common",
  },
  {
    id: 3,
    question: "Describe a project you're most proud of",
    tips: "Highlight your specific contributions and the impact of the project",
    difficulty: "Common",
  },
];

const interviewTips = [
  { category: "Before Interview", tips: ["Research the company", "Practice common questions", "Prepare questions to ask", "Test your tech setup (for virtual)"] },
  { category: "During Interview", tips: ["Arrive 10 minutes early", "Listen carefully", "Ask clarifying questions", "Show enthusiasm"] },
  { category: "After Interview", tips: ["Send thank-you email within 24 hours", "Reflect on performance", "Follow up if no response in 1 week"] },
];

export default function InterviewPrep() {
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);

  const toggleQuestion = (id: number) => {
    setCompletedQuestions((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/jobs" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Interview Preparation</h1>
            <p className="text-muted-foreground">Practice and prepare for your next interview</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <Code className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Technical</CardTitle>
              <CardDescription>Coding & system design</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{technicalQuestions.length}</div>
              <p className="text-sm text-muted-foreground">Practice questions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <MessageSquare className="h-8 w-8 text-accent mb-2" />
              <CardTitle>Behavioral</CardTitle>
              <CardDescription>Soft skills & experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{behavioralQuestions.length}</div>
              <p className="text-sm text-muted-foreground">Common scenarios</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Video className="h-8 w-8 text-secondary mb-2" />
              <CardTitle>Mock Interviews</CardTitle>
              <CardDescription>Practice with AI</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full mt-2">Start Practice</Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="technical" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
            <TabsTrigger value="tips">Tips & Guides</TabsTrigger>
          </TabsList>

          <TabsContent value="technical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Technical Interview Questions</CardTitle>
                <CardDescription>
                  Practice common technical questions. Click to reveal answers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {technicalQuestions.map((q) => (
                    <AccordionItem key={q.id} value={`tech-${q.id}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                              completedQuestions.includes(q.id)
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleQuestion(q.id);
                            }}
                          >
                            {completedQuestions.includes(q.id) && (
                              <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                            )}
                          </div>
                          <span className="flex-1">{q.question}</span>
                          <Badge variant="outline">{q.difficulty}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pl-8">
                        {q.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="behavioral" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Behavioral Interview Questions</CardTitle>
                <CardDescription>
                  Use the STAR method: Situation, Task, Action, Result
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {behavioralQuestions.map((q) => (
                    <AccordionItem key={q.id} value={`behavioral-${q.id}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                              completedQuestions.includes(q.id + 100)
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleQuestion(q.id + 100);
                            }}
                          >
                            {completedQuestions.includes(q.id + 100) && (
                              <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                            )}
                          </div>
                          <span className="flex-1">{q.question}</span>
                          <Badge variant="outline">{q.difficulty}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pl-8">
                        <strong>Tips:</strong> {q.tips}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            {interviewTips.map((section) => (
              <Card key={section.category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {section.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
