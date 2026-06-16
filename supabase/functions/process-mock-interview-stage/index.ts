import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { safeErrorMessage } from "../_shared/safeError.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StageQuestion {
  id: number;
  question: string;
  type: 'text' | 'multiple_choice' | 'scenario' | 'coding';
  options?: string[];
  expectedPoints?: string[];
  category: string;
  // Coding-specific fields
  functionSignature?: string;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  constraints?: string[];
  starterCode?: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
}

interface MockInterviewStage {
  name: string;
  order: number;
  description: string;
  questionCount: number;
  timePerQuestion: number;
  passingScore: number;
  stageType: 'email_info' | 'assessment' | 'slot_booking' | 'demo' | 'feedback' | 'hr_documents' | 'review' | 'coding';
  requiresSlotBooking?: boolean;
  autoProgressAfterCompletion?: boolean;
}

const INTERVIEW_STAGES: MockInterviewStage[] = [
  {
    name: 'Interview Instructions',
    order: 1,
    description: 'Receive detailed interview process instructions and guidelines via email.',
    questionCount: 0,
    timePerQuestion: 0,
    passingScore: 0,
    stageType: 'email_info',
    autoProgressAfterCompletion: true
  },
  {
    name: 'Technical Assessment Slot Booking',
    order: 2,
    description: 'Book your preferred slot for the Technical Assessment round.',
    questionCount: 0,
    timePerQuestion: 0,
    passingScore: 0,
    stageType: 'slot_booking',
    requiresSlotBooking: true,
    autoProgressAfterCompletion: true
  },
  {
    name: 'Technical Assessment',
    order: 3,
    description: 'Role-specific technical questions to assess your domain knowledge and problem-solving skills.',
    questionCount: 8,
    timePerQuestion: 150,
    passingScore: 70,
    stageType: 'assessment',
    autoProgressAfterCompletion: false
  },
  {
    name: 'Demo Slot Booking',
    order: 4,
    description: 'Book your preferred interview slot for the Demo Round.',
    questionCount: 0,
    timePerQuestion: 0,
    passingScore: 0,
    stageType: 'slot_booking',
    requiresSlotBooking: true,
    autoProgressAfterCompletion: true
  },
  {
    name: 'Demo Round',
    order: 5,
    description: 'Live teaching demonstration where AI evaluates your teaching clarity, subject knowledge, and presentation skills.',
    questionCount: 1,
    timePerQuestion: 600, // 10 minutes
    passingScore: 65,
    stageType: 'demo',
    autoProgressAfterCompletion: true
  },
  {
    name: 'Demo Feedback',
    order: 6,
    description: 'View detailed feedback metrics and AI evaluation of your demo teaching performance.',
    questionCount: 0,
    timePerQuestion: 0,
    passingScore: 0,
    stageType: 'feedback',
    autoProgressAfterCompletion: true
  },
  {
    name: 'Final Review (HR)',
    order: 7,
    description: 'HR round - Submit required documents for verification and final review.',
    questionCount: 4,
    timePerQuestion: 120,
    passingScore: 75,
    stageType: 'hr_documents',
    autoProgressAfterCompletion: true
  },
  {
    name: 'All Reviews',
    order: 8,
    description: 'View comprehensive summary of all interview stages, scores, and final assessment.',
    questionCount: 0,
    timePerQuestion: 0,
    passingScore: 0,
    stageType: 'review',
    autoProgressAfterCompletion: false
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, sessionId, stageOrder, candidateProfile, answers, recordingUrl, bookedSlot, stageType: clientStageType, stageName: clientStageName } = await req.json();

    console.log('Mock interview action:', { action, sessionId, stageOrder, hasRecording: !!recordingUrl, clientStageType, clientStageName });

    if (action === 'get_stages') {
      return new Response(JSON.stringify({ stages: INTERVIEW_STAGES }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'complete_instructions') {
      // Mark instructions stage as completed and move to technical assessment
      const stage = INTERVIEW_STAGES[0];
      
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: sessionId,
          stage_name: stage.name,
          stage_order: stage.order,
          ai_score: 100,
          ai_feedback: 'Interview instructions reviewed successfully.',
          passed: true,
          completed_at: new Date().toISOString()
        });

      await supabase
        .from('mock_interview_sessions')
        .update({
          current_stage_order: 2,
          stages_completed: [stage.name],
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return new Response(JSON.stringify({ 
        success: true,
        nextStage: INTERVIEW_STAGES[1],
        nextStageOrder: 2
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'book_slot') {
      // Handle slot booking for demo round
      const stage = INTERVIEW_STAGES.find(s => s.order === stageOrder);
      if (!stage || stage.stageType !== 'slot_booking') {
        throw new Error('Invalid stage for slot booking');
      }

      await supabase
        .from('mock_interview_stage_results')
        .upsert({
          session_id: sessionId,
          stage_name: stage.name,
          stage_order: stage.order,
          ai_score: 100,
          ai_feedback: `Demo interview slot booked for ${bookedSlot}`,
          passed: true,
          completed_at: new Date().toISOString(),
          answers: { bookedSlot }
        });

      // Get current session
      const { data: currentSession } = await supabase
        .from('mock_interview_sessions')
        .select('stages_completed')
        .eq('id', sessionId)
        .single();

      const currentStagesCompleted = (currentSession?.stages_completed as string[]) || [];
      const updatedStagesCompleted = [...currentStagesCompleted, stage.name];

      await supabase
        .from('mock_interview_sessions')
        .update({
          current_stage_order: 4, // Move to Demo Round
          stages_completed: updatedStagesCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return new Response(JSON.stringify({ 
        success: true,
        nextStage: INTERVIEW_STAGES[3], // Demo Round
        nextStageOrder: 4,
        bookedSlot
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'complete_demo_feedback') {
      // Mark demo feedback as reviewed
      const stage = INTERVIEW_STAGES.find(s => s.order === 5);
      if (!stage) throw new Error('Demo feedback stage not found');

      // Get demo round result for feedback
      const { data: demoResult } = await supabase
        .from('mock_interview_stage_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('stage_order', 4)
        .single();

      await supabase
        .from('mock_interview_stage_results')
        .upsert({
          session_id: sessionId,
          stage_name: stage.name,
          stage_order: stage.order,
          ai_score: demoResult?.ai_score || 0,
          ai_feedback: 'Demo feedback reviewed.',
          passed: true,
          completed_at: new Date().toISOString(),
          strengths: demoResult?.strengths || [],
          improvements: demoResult?.improvements || []
        });

      const { data: currentSession } = await supabase
        .from('mock_interview_sessions')
        .select('stages_completed')
        .eq('id', sessionId)
        .single();

      const currentStagesCompleted = (currentSession?.stages_completed as string[]) || [];
      const updatedStagesCompleted = [...currentStagesCompleted, stage.name];

      await supabase
        .from('mock_interview_sessions')
        .update({
          current_stage_order: 6,
          stages_completed: updatedStagesCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return new Response(JSON.stringify({ 
        success: true,
        nextStage: INTERVIEW_STAGES[5], // Final Review (HR)
        nextStageOrder: 6
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate_questions') {
      let stage = INTERVIEW_STAGES.find(s => s.order === stageOrder);
      
      // If client provides stage info (e.g. coding test from pipeline config), use it
      const effectiveStageType = clientStageType || stage?.stageType;
      const effectiveStageName = clientStageName || stage?.name || `Stage ${stageOrder}`;
      
      // If client overrides stage type/name (non-default pipeline like Civil Engineering),
      // always create a virtual stage to avoid using hardcoded education pipeline defaults
      const clientOverridesStage = clientStageType && clientStageName && 
        stage && (stage.stageType !== clientStageType || stage.name !== clientStageName);
      
      if (!stage || clientOverridesStage) {
        const isTechnicalInterview = effectiveStageName.toLowerCase().includes('technical interview');
        // Create a virtual stage from client data for non-default pipelines
        stage = {
          name: effectiveStageName,
          order: stageOrder,
          description: '',
          questionCount: isTechnicalInterview ? 20 : effectiveStageType === 'coding' ? 1 : 8,
          timePerQuestion: isTechnicalInterview ? 120 : effectiveStageType === 'coding' ? 1800 : 150,
          passingScore: 65,
          stageType: effectiveStageType || 'assessment',
          autoProgressAfterCompletion: false
        };
      }

      // Generate questions for assessment, hr_documents, and coding stages
      if (effectiveStageType !== 'assessment' && effectiveStageType !== 'hr_documents' && effectiveStageType !== 'coding') {
        return new Response(JSON.stringify({ 
          questions: [], 
          stage,
          timePerQuestion: 0,
          message: 'This stage does not require questions'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const prompt = buildQuestionGenerationPrompt(stage, candidateProfile);
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: effectiveStageType === 'coding' 
              ? 'You are an expert software engineering interviewer. Generate coding challenges with clear problem statements, examples, constraints, and starter code. The candidate will write actual code that gets evaluated.'
              : 'You are an expert HR interviewer and technical recruiter. Generate realistic interview questions based on the stage and candidate profile.' },
            { role: 'user', content: prompt }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'generate_interview_questions',
              description: effectiveStageType === 'coding' 
                ? 'Generate coding challenges with problem statements, examples, starter code, and test cases'
                : 'Generate interview questions for a specific stage',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        question: { type: 'string', description: 'The problem statement or question text' },
                        type: { type: 'string', enum: ['text', 'multiple_choice', 'scenario', 'coding'] },
                        options: { type: 'array', items: { type: 'string' } },
                        correctAnswer: { type: 'string', description: 'For multiple_choice questions: the exact correct option text from options array' },
                        expectedPoints: { type: 'array', items: { type: 'string' } },
                        category: { type: 'string' },
                        functionSignature: { type: 'string', description: 'Function signature e.g. function twoSum(nums: number[], target: number): number[]' },
                        examples: { type: 'array', items: { type: 'object', properties: { input: { type: 'string' }, output: { type: 'string' }, explanation: { type: 'string' } }, required: ['input', 'output'] } },
                        constraints: { type: 'array', items: { type: 'string' } },
                        starterCode: { type: 'string', description: 'Starter code template for the candidate to complete' },
                        testCases: { type: 'array', items: { type: 'object', properties: { input: { type: 'string' }, expectedOutput: { type: 'string' } }, required: ['input', 'expectedOutput'] } },
                        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                        language: { type: 'string', description: 'Programming language e.g. javascript, python' }
                      },
                      required: ['id', 'question', 'type', 'category']
                    }
                  }
                },
                required: ['questions']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'generate_interview_questions' } }
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', errorText);
        throw new Error('Failed to generate questions');
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      let questions: StageQuestion[] = [];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        questions = parsed.questions || [];
      }

      // Update session with generated questions
      if (sessionId) {
        await supabase
          .from('mock_interview_stage_results')
          .insert({
            session_id: sessionId,
            stage_name: stage.name,
            stage_order: stage.order,
            questions: questions
          });
      }

      return new Response(JSON.stringify({ 
        questions, 
        stage,
        timePerQuestion: stage.timePerQuestion
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'evaluate_answers') {
      const stage = INTERVIEW_STAGES.find(s => s.order === stageOrder);
      if (!stage) {
        throw new Error('Invalid stage order');
      }
      // Get the stage result with questions
      const { data: stageResult } = await supabase
        .from('mock_interview_stage_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('stage_order', stageOrder)
        .single();

      const evaluationPrompt = buildEvaluationPrompt(stage, stageResult?.questions || [], answers, candidateProfile);

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are an expert HR interviewer and technical recruiter. Evaluate candidate answers objectively and provide constructive feedback.' },
            { role: 'user', content: evaluationPrompt }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'evaluate_interview_answers',
              description: 'Evaluate interview answers and provide scores and feedback',
              parameters: {
                type: 'object',
                properties: {
                  overallScore: { type: 'number', description: 'Score from 0-100' },
                  passed: { type: 'boolean' },
                  feedback: { type: 'string' },
                  strengths: { type: 'array', items: { type: 'string' } },
                  improvements: { type: 'array', items: { type: 'string' } },
                  questionScores: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        questionId: { type: 'number' },
                        score: { type: 'number' },
                        feedback: { type: 'string' }
                      }
                    }
                  }
                },
                required: ['overallScore', 'passed', 'feedback', 'strengths', 'improvements']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'evaluate_interview_answers' } }
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', errorText);
        throw new Error('Failed to evaluate answers');
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      let evaluation = {
        overallScore: 0,
        passed: false,
        feedback: 'Unable to evaluate responses',
        strengths: [],
        improvements: [],
        questionScores: []
      };

      if (toolCall?.function?.arguments) {
        evaluation = JSON.parse(toolCall.function.arguments);
      }

      // Update stage result with recording URL, strengths, and improvements
      await supabase
        .from('mock_interview_stage_results')
        .update({
          answers: answers,
          ai_score: evaluation.overallScore,
          ai_feedback: evaluation.feedback,
          passed: evaluation.passed,
          completed_at: new Date().toISOString(),
          recording_url: recordingUrl || null,
          strengths: evaluation.strengths || [],
          improvements: evaluation.improvements || [],
          question_scores: evaluation.questionScores || []
        })
        .eq('session_id', sessionId)
        .eq('stage_order', stageOrder);

      // Determine next stage based on current stage
      const currentStageIndex = INTERVIEW_STAGES.findIndex(s => s.order === stageOrder);
      const currentStage = INTERVIEW_STAGES[currentStageIndex];
      
      // Get next stage order based on stage type
      let nextStageOrder = stageOrder + 1;
      
      // Special handling: After Technical Assessment (stage 2), go to Slot Booking (stage 3)
      // After Slot Booking, go to Demo Round (stage 4)
      // After Demo Round (stage 4), go to Demo Feedback (stage 5)
      // After Demo Feedback (stage 5), go to Final Review HR (stage 6)
      // After Final Review (stage 6), go to All Reviews (stage 7)
      
      const isLastStage = stageOrder >= INTERVIEW_STAGES.length;
      const shouldAutoProgress = currentStage?.autoProgressAfterCompletion !== false;

      // Get current session to append to stages_completed
      const { data: currentSession } = await supabase
        .from('mock_interview_sessions')
        .select('stages_completed')
        .eq('id', sessionId)
        .single();

      const currentStagesCompleted = (currentSession?.stages_completed as string[]) || [];
      const updatedStagesCompleted = [...currentStagesCompleted, stage.name];

      console.log('Stage evaluation result:', {
        passed: evaluation.passed,
        isLastStage,
        nextStageOrder,
        stageName: stage.name,
        score: evaluation.overallScore,
        shouldAutoProgress
      });

      if (!isLastStage) {
        // For Technical Assessment (stage 2), move to slot booking but don't auto-send email
        const { error: updateError } = await supabase
          .from('mock_interview_sessions')
          .update({
            current_stage_order: nextStageOrder,
            stages_completed: updatedStagesCompleted,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (updateError) {
          console.error('Error updating session:', updateError);
        } else {
          console.log('Session updated to next stage:', nextStageOrder);
        }
      } else {
        // Last stage completed - mark session as completed
        const { data: allResults } = await supabase
          .from('mock_interview_stage_results')
          .select('ai_score')
          .eq('session_id', sessionId);

        const scoredResults = allResults?.filter(r => r.ai_score !== null && r.ai_score > 0) || [];
        const avgScore = scoredResults.length 
          ? scoredResults.reduce((sum, r) => sum + (r.ai_score || 0), 0) / scoredResults.length 
          : 0;

        await supabase
          .from('mock_interview_sessions')
          .update({
            status: 'completed',
            stages_completed: updatedStagesCompleted,
            overall_score: avgScore,
            overall_feedback: 'You have completed all interview stages.',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        console.log('Interview completed with avg score:', avgScore);
      }

      // Return next stage info - but for Technical Assessment (stage 2), don't auto-send email
      const nextStage = !isLastStage ? INTERVIEW_STAGES[stageOrder] : null;
      const shouldSendEmail = shouldAutoProgress && nextStage?.stageType !== 'slot_booking' && nextStage?.stageType !== 'feedback' && nextStage?.stageType !== 'review';

      return new Response(JSON.stringify({
        evaluation,
        nextStage,
        nextStageOrder: nextStageOrder,
        isComplete: isLastStage,
        passed: evaluation.passed,
        sessionId,
        shouldSendEmail,
        requiresSlotBooking: nextStage?.stageType === 'slot_booking'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error: unknown) {
    console.error('Error in process-mock-interview-stage:', error);
    const errorMessage = safeErrorMessage(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildQuestionGenerationPrompt(stage: MockInterviewStage, profile: any): string {
  const profileInfo = profile ? `
Candidate Profile:
- Name: ${profile.full_name || 'Not specified'}
- Current Role: ${profile.preferred_role || 'Not specified'}
- Experience Level: ${profile.experience_level || 'Entry Level'}
- Skills: ${profile.skills?.join(', ') || 'Not specified'}
- Highest Qualification: ${profile.highest_qualification || 'Not specified'}
- Primary Subject: ${profile.primary_subject || 'General Knowledge'}
` : 'No profile information available.';

  if (stage.stageType === 'coding') {
    const role = profile?.preferred_role || profile?.primary_subject || 'software development';
    const skills = profile?.skills?.join(', ') || 'JavaScript, Python';
    return `Generate ${stage.questionCount} coding challenge(s) for a developer interview.

${profileInfo}

CRITICAL: Generate CODING PROBLEMS, not text questions or MCQs. Each problem must include:
1. A clear problem statement describing what the candidate needs to implement
2. A function signature they need to complete
3. 2-3 examples with input, output, and explanation
4. Constraints (e.g., array length limits, value ranges)
5. Starter code template with the function skeleton
6. 3-4 test cases with input and expected output for validation
7. Difficulty level (easy/medium/hard)

Focus the problems on skills relevant to: ${role}
Candidate's known skills: ${skills}

The problems should test:
- Algorithm design and problem solving
- Data structure usage
- Code correctness and edge case handling
- Clean code practices

Set type to "coding" for all questions. Use JavaScript/TypeScript as the default language.
Generate problems appropriate for the candidate's experience level: ${profile?.experience_level || 'Entry Level'}.

Example format for a coding problem:
- question: "Two Sum - Given an array of integers nums and an integer target, return indices of the two numbers that add up to target."
- functionSignature: "function twoSum(nums: number[], target: number): number[]"
- examples: [{input: "nums = [2,7,11,15], target = 9", output: "[0, 1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9"}]
- constraints: ["2 <= nums.length <= 10^4", "Each input has exactly one solution"]
- starterCode: "function twoSum(nums, target) {\\n  // Write your code here\\n  \\n}"
- testCases: [{input: "[2,7,11,15], 9", expectedOutput: "[0,1]"}]
- difficulty: "easy"
- language: "javascript"`;
  }

  const subjectFocus = profile?.primary_subject 
    ? `Focus questions specifically on ${profile.primary_subject} topics.`
    : 'Focus on general teaching aptitude and pedagogical skills.';

  const isTechnicalInterview = stage.name.toLowerCase().includes('technical interview');

  if (isTechnicalInterview) {
    const role = profile?.preferred_role || profile?.primary_subject || 'software development';
    const skills = profile?.skills?.join(', ') || 'JavaScript, Python, Data Structures';
    return `Generate exactly ${stage.questionCount} DIFFICULT technical interview questions for a ${role} position.

${profileInfo}

IMPORTANT: These must be HARD-LEVEL questions that test deep understanding. 
Focus on: ${role}
Candidate's known skills: ${skills}

Question categories to cover (distribute across all ${stage.questionCount} questions):
- Data Structures & Algorithms (complex problems, time/space complexity analysis)
- System Design (scalability, distributed systems, database design)
- Advanced Language Concepts (closures, memory management, concurrency, generics)
- Design Patterns & Architecture (SOLID principles, microservices, event-driven)
- Problem Solving & Optimization (real-world scenarios, trade-offs)
- Security & Performance (authentication, caching, load balancing)
- Database Design (indexing, normalization, query optimization)
- DevOps & Infrastructure (CI/CD, containerization, monitoring)

Requirements:
1. ALL questions must be DIFFICULT - no easy or basic questions
2. Each question should require deep technical knowledge to answer well
3. Include scenario-based and problem-solving questions
4. For multiple choice questions, provide 4 options with plausible distractors AND set correctAnswer to the exact text of the right option
5. Include expected key points for text answers
6. Mix question types: multiple_choice and text/scenario

Generate exactly ${stage.questionCount} questions.`;
  }

  return `Generate ${stage.questionCount} interview questions for the "${stage.name}" stage.

Stage Description: ${stage.description}

${profileInfo}

IMPORTANT: ${subjectFocus}

Requirements:
1. Questions should be relevant to the candidate's background
2. Mix of difficulty levels
3. For multiple choice questions, provide 4 options AND set correctAnswer to the exact text of the right option
4. Include expected key points for text answers

For "${stage.name}" stage, focus on:
${stage.stageType === 'assessment' ? `- Deep knowledge of ${profile?.primary_subject || profile?.preferred_role || 'the subject'} concepts
- Problem-solving and practical application` : ''}
${stage.stageType === 'demo' ? '- Teaching demonstration, presentation skills, subject knowledge' : ''}
${stage.stageType === 'hr_documents' ? '- HR questions, document verification, future plans' : ''}

Generate exactly ${stage.questionCount} questions.`;
}

function buildEvaluationPrompt(stage: MockInterviewStage, questions: any[], answers: any[], profile: any): string {
  if (stage.stageType === 'coding') {
    const qaPairs = questions.map((q: any, i: number) => `
Problem ${i + 1}: ${q.question}
Function Signature: ${q.functionSignature || 'N/A'}
Test Cases: ${JSON.stringify(q.testCases || [])}
Candidate's Code:
\`\`\`
${answers[i] || 'No code submitted'}
\`\`\`
`).join('\n');

    return `Evaluate the following coding submissions for the "${stage.name}" stage.

Passing Score Required: ${stage.passingScore}%

Candidate Profile:
- Name: ${profile?.full_name || 'Not specified'}
- Experience Level: ${profile?.experience_level || 'Entry Level'}

Problems and Submissions:
${qaPairs}

Evaluation Criteria:
1. Correctness - Does the code solve the problem? Would it pass the test cases?
2. Code Quality - Is the code clean, readable, well-structured?
3. Algorithm Efficiency - Time and space complexity analysis
4. Edge Cases - Does the code handle edge cases?
5. Best Practices - Variable naming, comments, error handling

Provide:
- Overall score (0-100)
- Whether they passed (score >= ${stage.passingScore})
- Detailed feedback on their code
- Key strengths (2-4 points about their coding)
- Areas for improvement (2-4 specific coding improvements)
- Individual problem scores and code review feedback`;
  }

  const qaPairs = questions.map((q: any, i: number) => `
Question ${i + 1}: ${q.question}
${q.expectedPoints ? `Expected Points: ${q.expectedPoints.join(', ')}` : ''}
Candidate Answer: ${answers[i] || 'No answer provided'}
`).join('\n');

  return `Evaluate the following interview answers for the "${stage.name}" stage.

Passing Score Required: ${stage.passingScore}%

Candidate Profile:
- Name: ${profile?.full_name || 'Not specified'}
- Experience Level: ${profile?.experience_level || 'Entry Level'}

Questions and Answers:
${qaPairs}

Provide:
- Overall score (0-100)
- Whether they passed (score >= ${stage.passingScore})
- Constructive feedback
- Key strengths (2-4 points)
- Areas for improvement (2-4 points)
- Individual question scores and brief feedback`;
}
