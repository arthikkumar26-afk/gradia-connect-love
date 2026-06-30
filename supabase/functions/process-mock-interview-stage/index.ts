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
  correctAnswer?: string;
  expectedAnswer?: string;
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
    passingScore: 60,
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
    passingScore: 60,
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
    passingScore: 60,
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
        const lowerName = effectiveStageName.toLowerCase();
        const isTechnicalInterview = lowerName.includes('technical interview');
        const isHRRound = lowerName === 'hr round' || lowerName.includes('hr interview');
        const isJam = lowerName.includes('jam') || lowerName.includes('just a minute');
        // Create a virtual stage from client data for non-default pipelines
        stage = {
          name: effectiveStageName,
          order: stageOrder,
          description: '',
          questionCount: isJam ? 1 : isHRRound ? 10 : isTechnicalInterview ? 10 : effectiveStageType === 'coding' ? 1 : 10,
          timePerQuestion: isHRRound ? 90 : isTechnicalInterview ? 120 : effectiveStageType === 'coding' ? 1800 : 120,
          passingScore: 60,
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
      let questions: StageQuestion[] = [];

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
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
                          expectedAnswer: { type: 'string', description: 'For typed/scenario questions: a concise model answer reviewers can compare against' },
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
        if (toolCall?.function?.arguments) {
          const parsed = JSON.parse(toolCall.function.arguments);
          questions = Array.isArray(parsed.questions) ? parsed.questions : [];
        }
      } catch (generationError) {
        console.error('AI question generation failed:', generationError);
      }

      if (questions.length === 0 && isHRQuestionStage(stage)) {
        questions = buildFallbackHRRoundQuestions(stage.questionCount || 10);
      }

      if (questions.length === 0) {
        return new Response(JSON.stringify({
          error: 'QUESTION_GENERATION_FAILED',
          fallback: true,
          message: 'Interview questions could not be prepared. Please try again in a moment.',
          questions: [],
          stage,
          timePerQuestion: stage.timePerQuestion
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update session with generated questions
      if (sessionId) {
        await supabase
          .from('mock_interview_stage_results')
          .upsert({
            session_id: sessionId,
            stage_name: stage.name,
            stage_order: stage.order,
            questions: questions
          }, {
            onConflict: 'session_id,stage_order'
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
      // Get the stage result with questions
      const { data: stageResult } = await supabase
        .from('mock_interview_stage_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('stage_order', stageOrder)
        .single();

      let stage = INTERVIEW_STAGES.find(s => s.order === stageOrder);
      const storedQuestions = Array.isArray(stageResult?.questions) ? stageResult.questions as StageQuestion[] : [];
      const storedStageName = stageResult?.stage_name as string | undefined;
      const effectiveStageName = clientStageName || storedStageName || stage?.name || `Stage ${stageOrder}`;
      const effectiveStageType = clientStageType || inferStageType(effectiveStageName, stage?.stageType);
      if (!stage || stage.name !== effectiveStageName || stage.stageType !== effectiveStageType) {
        stage = {
          name: effectiveStageName,
          order: stageOrder,
          description: '',
          questionCount: storedQuestions.length || 15,
          timePerQuestion: effectiveStageType === 'coding' ? 1800 : 120,
          passingScore: 60,
          stageType: effectiveStageType,
          autoProgressAfterCompletion: false
        };
      }

      const evaluationPrompt = buildEvaluationPrompt(stage, storedQuestions, answers, candidateProfile);

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
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
                          feedback: { type: 'string' },
                          result: { type: 'string', enum: ['correct', 'partially_correct', 'wrong', 'not_answered'], description: 'Correctness label for this answer' },
                          correctAnswer: { type: 'string', description: 'The correct option/model answer to show in the report' },
                          expectedAnswer: { type: 'string', description: 'Key expected points/model answer for typed answers' }
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
      
      let evaluation: any = {
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

      // Enforce strict pass threshold — override AI hallucinations
      evaluation.passed = (evaluation.overallScore || 0) >= 60;
      evaluation.questionScores = enrichQuestionScores(storedQuestions, answers || [], evaluation.questionScores || []);
      if (evaluation.questionScores.length > 0) {
        evaluation.overallScore = Math.round(
          evaluation.questionScores.reduce((sum: number, item: any) => sum + (Number(item.score) || 0), 0) / evaluation.questionScores.length
        );
        evaluation.passed = evaluation.overallScore >= 60;
      }

      // Update stage result with recording URL, strengths, and improvements
      const { error: resultUpdateError } = await supabase
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

      if (resultUpdateError) {
        console.error('Error updating stage result:', resultUpdateError);
        throw new Error('Failed to save evaluated answers');
      }

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

  const role = profile?.preferred_role || 'the target role';
  const isEducationRole = /teacher|tutor|lecturer|professor|instructor|trainer|faculty|principal|coordinator|education/i.test(role);
  const isHRRole = /\bhr\b|human resource|recruit|talent acquisition|people operations|hrbp|hr executive|hr manager|hr generalist|\bmba\b|business analyst|business analytics|management trainee|operations manager|marketing manager|sales manager|product manager|finance manager|administration|admin executive|office manager|executive assistant/i.test(role);
  const subjectFocus = isEducationRole && profile?.primary_subject
    ? `Focus questions specifically on ${profile.primary_subject} topics relevant to a ${role}.`
    : `Focus questions specifically on the "${stage.name}" stage and the responsibilities of a ${role}. DO NOT ask about unrelated academic subjects (e.g. cybersecurity, social studies, physics) unless the role itself is in that domain.`;

  const stageNameLower = stage.name.toLowerCase();
  const isAptitudeStage = stageNameLower.includes('aptitude');
  const isTechnicalInterview = stageNameLower.includes('technical interview');
  const isHRRoundStage = stageNameLower === 'hr round' || stageNameLower.includes('hr interview') || stageNameLower.includes('hr round');

  if (isHRRoundStage) {
    return `Generate exactly ${stage.questionCount} HR ROUND behavioral & situational interview questions for a general professional candidate applying for an HR / management position.

${profileInfo}

Distribute across:
- Behavioral (tell me about a time…, strengths/weaknesses, motivation, career goals)
- Situational / Workplace scenarios (conflict, deadline pressure, teamwork, leadership)
- Culture fit & values (why this company/role, work style, adaptability)
- Salary expectations, notice period, relocation willingness
- Communication, emotional intelligence & self-awareness

Requirements:
1. Mix multiple_choice and scenario/text question types.
2. For multiple_choice, provide 4 options and set correctAnswer to the EXACT text of the right option.
3. For text/scenario, include expectedAnswer and expectedPoints so typed answers can be graded.
4. Keep questions PURELY HR / behavioral / situational. STRICTLY DO NOT ask coding, programming, cybersecurity, IT, engineering, academic-subject, or any domain-technical questions.
5. DO NOT reference the candidate's previous technical domain or job title (e.g. "as a Cybersecurity Engineer", "as a Software Developer", "in your experience as a ..."). Frame every question as a generic HR interview question (e.g. "Tell me about a time…", "How would you handle…", "Why do you want this role?").
6. You may use the candidate's first name naturally, but never tie questions to their prior technical role.

Generate exactly ${stage.questionCount} questions.`;
  }

  if (isAptitudeStage) {
    return `Generate exactly ${stage.questionCount} APTITUDE multiple-choice questions for a ${role} candidate.

${profileInfo}

Cover a balanced mix across:
- Quantitative Aptitude (arithmetic, percentages, ratios, time & work, data interpretation)
- Logical Reasoning (series, puzzles, syllogisms, blood relations, coding-decoding)
- Verbal Ability (reading comprehension, synonyms/antonyms, sentence correction)

Requirements:
1. ALL questions must be multiple_choice with exactly 4 options.
2. Set correctAnswer to the EXACT text of the right option.
3. Include a brief expectedAnswer/explanation for review.
4. Difficulty appropriate for entry/mid-level candidates.
5. DO NOT ask domain-specific (HR / technical / coding) questions — pure aptitude only.

Generate exactly ${stage.questionCount} questions.`;
  }

  const isHRTechnicalStage = stageNameLower.includes('hr technical') || stageNameLower.startsWith('hr ');
  if (isTechnicalInterview && (isHRRole || isHRTechnicalStage)) {
    return `Generate exactly ${stage.questionCount} HR domain "Technical Interview" questions for a ${role} candidate.

${profileInfo}

Distribute questions across these HR topics:
1. Recruitment & Talent Acquisition — recruitment process, recruitment vs selection, sourcing, job portals, resume screening, Boolean search, shortlisting candidates.
2. Interview Knowledge — types of interviews, conducting an HR interview, candidate questions, qualities to look for.
3. HR Fundamentals — onboarding, induction, employee engagement, performance appraisal, HRM vs HRD.
4. Payroll & Compliance (Basic) — CTC, CTC vs take-home, PF, ESI, gratuity, TDS.
5. Workplace Scenarios — candidate no-show, handling a difficult employee, resolving workplace conflict, managing multiple openings.
6. HR Tools — ATS usage, job portals, LinkedIn Recruiter, Excel for HR reports.
7. Communication — explaining a job role, convincing a candidate to join, handling salary negotiation.

Requirements:
1. Cover ALL 7 topic groups across the ${stage.questionCount} questions.
2. Mix question types: multiple_choice and scenario/text.
3. For multiple_choice, provide 4 options and set correctAnswer to the exact text of the right option.
4. For text/scenario, include expectedAnswer and expectedPoints so typed answers can be graded.
5. Questions must be HR-specific — do NOT ask software/coding/academic subject questions.

Generate exactly ${stage.questionCount} questions.`;
  }

  if (isTechnicalInterview) {
    const techRole = profile?.preferred_role || profile?.primary_subject || 'software development';
    const skills = profile?.skills?.join(', ') || 'JavaScript, Python, Data Structures';
    return `Generate exactly ${stage.questionCount} DIFFICULT technical interview questions for a ${techRole} position.

${profileInfo}

IMPORTANT: These must be HARD-LEVEL questions that test deep understanding. 
Focus on: ${techRole}
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
5. For every text or scenario question, include expectedAnswer plus expectedPoints so typed answers can be marked Correct, Partially Correct, or Wrong in the report
6. Mix question types: multiple_choice and text/scenario

Generate exactly ${stage.questionCount} questions.`;
  }

  const isHRStage = /hr|human resource|behavioral|behaviour|final review/i.test(stage.name);

  let stageSpecificGuidance = '';
  if (stage.stageType === 'assessment') {
    if (isHRStage) {
      stageSpecificGuidance = `- Behavioral, situational, and HR-style questions tailored to a ${role}
- Communication, conflict resolution, teamwork, leadership, culture fit
- Real workplace scenarios a ${role} would face
- DO NOT ask academic subject questions (no cybersecurity, social studies, physics, chemistry, etc.) unless ${role} is in that exact domain`;
    } else if (isEducationRole) {
      stageSpecificGuidance = `- Deep knowledge of ${profile?.primary_subject || 'the teaching subject'} concepts
- Pedagogy, classroom management, and practical teaching application`;
    } else {
      stageSpecificGuidance = `- Core competencies, tools, and day-to-day responsibilities of a ${role}
- Practical, scenario-based problems a ${role} actually encounters on the job
- DO NOT default to teaching/education or unrelated academic subjects`;
    }
  }
  if (stage.stageType === 'demo') stageSpecificGuidance += '\n- Live demonstration, presentation skills, role-specific knowledge';
  if (stage.stageType === 'hr_documents') stageSpecificGuidance += `\n- HR questions for a ${role}, document verification, career plans, salary expectations, notice period`;

  return `Generate ${stage.questionCount} interview questions for the "${stage.name}" stage of a ${role} interview.

Stage Description: ${stage.description}

${profileInfo}

IMPORTANT: ${subjectFocus}

Requirements:
1. Questions MUST be relevant to the candidate's preferred role (${role}) and this specific stage ("${stage.name}").
2. Mix of difficulty levels appropriate to a ${role}.
3. For multiple choice questions, provide 4 options AND set correctAnswer to the exact text of the right option.
4. For every text or scenario question, include expectedAnswer plus expectedPoints so typed answers can be validated and shown as correct/wrong in the report.

For "${stage.name}" stage, focus on:
${stageSpecificGuidance}

Generate exactly ${stage.questionCount} questions.`;
}

function inferStageType(stageName: string, fallback?: MockInterviewStage['stageType']): MockInterviewStage['stageType'] {
  const name = (stageName || '').toLowerCase();
  if (name.includes('coding test') && !name.includes('slot')) return 'coding';
  if (name.includes('slot booking')) return 'slot_booking';
  if (name.includes('demo') || name.includes('jam') || name.includes('just a minute')) return 'demo';
  if (name.includes('feedback') || name.includes('result')) return 'feedback';
  if (name.includes('hr') || name.includes('final review')) return 'hr_documents';
  if (name === 'final review' || name.includes('all review')) return 'review';
  if (name.includes('instruction') || name.includes('invitation') || name.includes('email')) return 'email_info';
  return fallback || 'assessment';
}

function stringifyAnswer(answer: any): string {
  if (answer == null) return '';
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'object') return answer.answer ?? answer.code ?? JSON.stringify(answer);
  return String(answer);
}

function stripOptionPrefix(value: string): string {
  return String(value || '')
    .trim()
    .replace(/^\(?[A-Da-d]\)?\s*[.)\-:]\s*/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function resolveOptionIndex(value: string, options: string[]): number {
  const raw = String(value || '').trim();
  const letterMatch = raw.match(/^\(?([A-Da-d])\)?(?:\s*[.)\-:]\s*)?$/);
  if (letterMatch) return letterMatch[1].toUpperCase().charCodeAt(0) - 65;
  const rawLetterWithText = raw.match(/^\(?([A-Da-d])\)?\s*[.)\-:]\s*/);
  const normalized = stripOptionPrefix(raw);
  const byText = options.findIndex((opt) => stripOptionPrefix(opt) === normalized || opt.trim().toLowerCase() === raw.toLowerCase());
  if (byText >= 0) return byText;
  if (rawLetterWithText) {
    const idx = rawLetterWithText[1].toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < options.length) return idx;
  }
  return -1;
}

function getExpectedAnswer(question: any): string {
  if (!question || typeof question !== 'object') return '';
  if (question.correctAnswer) return String(question.correctAnswer);
  if (question.expectedAnswer) return String(question.expectedAnswer);
  if (Array.isArray(question.expectedPoints) && question.expectedPoints.length > 0) {
    return question.expectedPoints.join('; ');
  }
  return '';
}

function statusFromScore(score: number, hasAnswer: boolean): 'correct' | 'partially_correct' | 'wrong' | 'not_answered' {
  if (!hasAnswer) return 'not_answered';
  if (score >= 80) return 'correct';
  if (score >= 40) return 'partially_correct';
  return 'wrong';
}

function enrichQuestionScores(questions: any[], answers: any[], rawScores: any[]): any[] {
  return (questions || []).map((question: any, index: number) => {
    const questionId = question?.id ?? index + 1;
    const existing = rawScores.find((item: any) => item?.questionId === questionId) || rawScores[index] || {};
    const answerText = stringifyAnswer(answers[index]).trim();
    const hasAnswer = answerText.length > 0;
    const type = typeof question === 'object' ? question?.type : 'text';
    const options = typeof question === 'object' && Array.isArray(question?.options) ? question.options : [];
    const correctAnswer = getExpectedAnswer(question);

    if (type === 'multiple_choice' && options.length > 0) {
      const chosenIndex = resolveOptionIndex(answerText, options);
      const correctIndex = resolveOptionIndex(correctAnswer, options);
      const isCorrect = hasAnswer && chosenIndex >= 0 && chosenIndex === correctIndex;
      const selectedText = chosenIndex >= 0 ? options[chosenIndex] : answerText;
      const correctText = correctIndex >= 0 ? options[correctIndex] : correctAnswer;
      return {
        ...existing,
        questionId,
        score: hasAnswer ? (isCorrect ? 100 : 0) : 0,
        result: hasAnswer ? (isCorrect ? 'correct' : 'wrong') : 'not_answered',
        selectedAnswer: selectedText,
        correctAnswer: correctText,
        expectedAnswer: correctText,
        feedback: existing.feedback || (hasAnswer
          ? (isCorrect ? 'Selected answer matches the correct option.' : `Selected answer is wrong. Correct answer: ${correctText || 'Not available'}.`)
          : `No answer submitted. Correct answer: ${correctText || 'Not available'}.`)
      };
    }

    const numericScore = Math.max(0, Math.min(100, Number(existing.score) || 0));
    const result = existing.result || statusFromScore(numericScore, hasAnswer);
    return {
      ...existing,
      questionId,
      score: numericScore,
      result,
      correctAnswer,
      expectedAnswer: correctAnswer,
      feedback: existing.feedback || (hasAnswer
        ? `Answer marked ${String(result).replace('_', ' ')} based on the expected points.`
        : `No answer submitted. Expected answer: ${correctAnswer || 'Not available'}.`)
    };
  });
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
Question Type: ${q.type || 'text'}
Correct Option / Model Answer: ${q.correctAnswer || q.expectedAnswer || 'Not provided'}
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
- Individual question scores and brief feedback
- For each question score, include result as one of: correct, partially_correct, wrong, not_answered
- For multiple-choice answers, compare the selected option against correctAnswer exactly and score 100 for correct, 0 for wrong/not answered
- For typed/scenario answers, compare against expectedAnswer/expectedPoints and include the model answer in expectedAnswer so the report can show why it is correct or wrong`;
}
