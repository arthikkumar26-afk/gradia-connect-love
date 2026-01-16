import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StageQuestion {
  id: number;
  question: string;
  type: 'text' | 'multiple_choice' | 'scenario';
  options?: string[];
  expectedPoints?: string[];
  category: string;
}

interface MockInterviewStage {
  name: string;
  order: number;
  description: string;
  questionCount: number;
  timePerQuestion: number;
  passingScore: number;
}

const INTERVIEW_STAGES: MockInterviewStage[] = [
  {
    name: 'Resume Screening',
    order: 1,
    description: 'AI analyzes your resume and asks clarifying questions about your experience.',
    questionCount: 5,
    timePerQuestion: 90,
    passingScore: 60
  },
  {
    name: 'AI Phone Interview',
    order: 2,
    description: 'Initial screening questions about your background, motivation, and basic qualifications.',
    questionCount: 6,
    timePerQuestion: 120,
    passingScore: 65
  },
  {
    name: 'Technical Assessment',
    order: 3,
    description: 'Role-specific technical questions to assess your domain knowledge and problem-solving skills.',
    questionCount: 8,
    timePerQuestion: 150,
    passingScore: 70
  },
  {
    name: 'HR Round',
    order: 4,
    description: 'Behavioral and situational questions to assess cultural fit and soft skills.',
    questionCount: 6,
    timePerQuestion: 120,
    passingScore: 65
  },
  {
    name: 'Viva',
    order: 5,
    description: 'In-depth discussion about your experience, projects, and how you handle real-world scenarios.',
    questionCount: 5,
    timePerQuestion: 180,
    passingScore: 70
  },
  {
    name: 'Final Review',
    order: 6,
    description: 'Comprehensive assessment combining all previous stages for final evaluation.',
    questionCount: 4,
    timePerQuestion: 120,
    passingScore: 75
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

    const { action, sessionId, stageOrder, candidateProfile, answers, recordingUrl } = await req.json();

    console.log('Mock interview action:', { action, sessionId, stageOrder, hasRecording: !!recordingUrl });

    if (action === 'get_stages') {
      return new Response(JSON.stringify({ stages: INTERVIEW_STAGES }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate_questions') {
      const stage = INTERVIEW_STAGES.find(s => s.order === stageOrder);
      if (!stage) {
        throw new Error('Invalid stage order');
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
            { role: 'system', content: 'You are an expert HR interviewer and technical recruiter. Generate realistic interview questions based on the stage and candidate profile.' },
            { role: 'user', content: prompt }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'generate_interview_questions',
              description: 'Generate interview questions for a specific stage',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        question: { type: 'string' },
                        type: { type: 'string', enum: ['text', 'multiple_choice', 'scenario'] },
                        options: { type: 'array', items: { type: 'string' } },
                        expectedPoints: { type: 'array', items: { type: 'string' } },
                        category: { type: 'string' }
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

      // Update stage result with recording URL if provided
      await supabase
        .from('mock_interview_stage_results')
        .update({
          answers: answers,
          ai_score: evaluation.overallScore,
          ai_feedback: evaluation.feedback,
          passed: evaluation.passed,
          completed_at: new Date().toISOString(),
          recording_url: recordingUrl || null
        })
        .eq('session_id', sessionId)
        .eq('stage_order', stageOrder);

      // Update session progress
      const nextStageOrder = stageOrder + 1;
      const isLastStage = stageOrder >= INTERVIEW_STAGES.length;

      if (evaluation.passed && !isLastStage) {
        await supabase
          .from('mock_interview_sessions')
          .update({
            current_stage_order: nextStageOrder,
            stages_completed: supabase.rpc('array_append', { arr: 'stages_completed', elem: stage.name })
          })
          .eq('id', sessionId);
      } else if (isLastStage || !evaluation.passed) {
        // Calculate overall score
        const { data: allResults } = await supabase
          .from('mock_interview_stage_results')
          .select('ai_score')
          .eq('session_id', sessionId);

        const avgScore = allResults?.length 
          ? allResults.reduce((sum, r) => sum + (r.ai_score || 0), 0) / allResults.length 
          : 0;

        await supabase
          .from('mock_interview_sessions')
          .update({
            status: evaluation.passed ? 'completed' : 'failed',
            overall_score: avgScore,
            overall_feedback: evaluation.passed 
              ? 'Congratulations! You have successfully completed all interview stages.' 
              : `You did not pass the ${stage.name} stage. Keep practicing!`,
            completed_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      }

      return new Response(JSON.stringify({
        evaluation,
        nextStage: evaluation.passed && !isLastStage ? INTERVIEW_STAGES[stageOrder] : null,
        isComplete: isLastStage && evaluation.passed,
        isFailed: !evaluation.passed
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error: unknown) {
    console.error('Error in process-mock-interview-stage:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
- Primary Subject: ${profile.primary_subject || 'Not specified'}
` : 'No profile information available.';

  return `Generate ${stage.questionCount} interview questions for the "${stage.name}" stage.

Stage Description: ${stage.description}

${profileInfo}

Requirements:
1. Questions should be relevant to the stage type
2. Mix of difficulty levels (easy to challenging)
3. For multiple choice questions, provide 4 options
4. Include expected key points for text answers
5. Make questions specific to the candidate's background when possible

For "${stage.name}" stage, focus on:
${stage.order === 1 ? '- Resume clarification, experience verification, career highlights' : ''}
${stage.order === 2 ? '- Motivation, career goals, company fit, availability' : ''}
${stage.order === 3 ? '- Technical knowledge, problem-solving, domain expertise' : ''}
${stage.order === 4 ? '- Behavioral questions, teamwork, conflict resolution, leadership' : ''}
${stage.order === 5 ? '- Deep-dive discussions, project experiences, real-world scenarios' : ''}
${stage.order === 6 ? '- Comprehensive evaluation, future plans, final assessment questions' : ''}

Generate exactly ${stage.questionCount} questions.`;
}

function buildEvaluationPrompt(stage: MockInterviewStage, questions: any[], answers: any[], profile: any): string {
  const qaPairs = questions.map((q, i) => `
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

Evaluation Criteria:
1. Relevance and completeness of answers
2. Communication clarity
3. Technical accuracy (if applicable)
4. Professionalism and confidence
5. Specific examples and experiences mentioned

Provide:
- Overall score (0-100)
- Whether they passed (score >= ${stage.passingScore})
- Constructive feedback
- Key strengths (2-4 points)
- Areas for improvement (2-4 points)
- Individual question scores and brief feedback`;
}
