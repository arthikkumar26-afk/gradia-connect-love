import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stage-specific question configurations
interface StageConfig {
  questionCount: number;
  questionType: 'mcq' | 'text' | 'mixed' | 'video';
  timePerQuestion: number; // seconds
  promptTemplate: string;
}

const stageConfigs: Record<string, StageConfig> = {
  'Resume Screening': {
    questionCount: 5,
    questionType: 'mcq',
    timePerQuestion: 60,
    promptTemplate: `Generate 5 MCQ questions to verify the candidate's resume claims and basic qualifications.
Focus on:
- Educational background verification
- Work experience validation
- Basic skill assessment
- Career progression understanding`
  },
  'AI Phone Interview': {
    questionCount: 10,
    questionType: 'mcq',
    timePerQuestion: 90,
    promptTemplate: `Generate 10 MCQ questions for an AI phone screening interview for a {jobTitle} position.
Skills required: {skills}
Requirements: {requirements}

This is an automated AI-conducted phone interview. Focus on:
- Role-specific knowledge and skills
- Problem-solving abilities
- Situational judgment scenarios
- Communication and professionalism
- Critical thinking questions

Questions should be appropriate for an automated phone interview format.
Make questions progressively harder from moderate to challenging.`
  },
  'Technical Assessment': {
    questionCount: 10,
    questionType: 'mcq',
    timePerQuestion: 90,
    promptTemplate: `Generate 10 technical MCQ questions for a {jobTitle} position.
Skills required: {skills}
Requirements: {requirements}

Focus on:
- Core technical concepts
- Problem-solving abilities
- Best practices and design patterns
- Real-world scenario questions

Make questions progressively harder from basic to advanced.`
  },
  'Demo Video': {
    questionCount: 0,
    questionType: 'video',
    timePerQuestion: 600,
    promptTemplate: `This is a Demo Video round - no questions needed. The candidate will record a teaching demonstration video.`
  },
  'HR Round': {
    questionCount: 5,
    questionType: 'mixed',
    timePerQuestion: 120,
    promptTemplate: `Generate 5 HR assessment questions for the {jobTitle} position.
Include a mix of MCQ and short-answer questions.

Focus on:
- Communication skills
- Teamwork and collaboration
- Conflict resolution
- Career goals and motivation
- Cultural fit assessment

For MCQ questions, provide 4 options. For text questions, indicate expected response length.`
  },
  'Final Review': {
    questionCount: 8,
    questionType: 'mixed',
    timePerQuestion: 90,
    promptTemplate: `Generate 8 comprehensive final round questions for the {jobTitle} position.
Skills: {skills}

Include both MCQ and scenario-based questions covering:
- Technical competency summary
- Leadership potential
- Problem-solving approach
- Strategic thinking
- Long-term career alignment`
  },
  'Offer Stage': {
    questionCount: 3,
    questionType: 'text',
    timePerQuestion: 180,
    promptTemplate: `Generate 3 open-ended questions for the offer discussion stage.

Focus on:
- Salary expectations and negotiation
- Start date availability
- Notice period and transition
- Any questions or concerns about the offer`
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    if (!token) {
      throw new Error('Interview token is required');
    }

    console.log('Starting interview with token:', token);

    // Validate token and get interview details
    const { data: invitation, error: invError } = await supabase
      .from('interview_invitations')
      .select(`
        *,
        interview_event:interview_events(
          *,
          stage:interview_stages(*),
          interview_candidate:interview_candidates(
            *,
            candidate:profiles(*),
            job:jobs(*)
          )
        )
      `)
      .eq('invitation_token', token)
      .single();

    if (invError || !invitation) {
      console.error('Invalid token:', invError);
      throw new Error('Invalid or expired interview link');
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('This interview link has expired');
    }

    const interviewEvent = invitation.interview_event;
    const candidate = interviewEvent.interview_candidate.candidate;
    const job = interviewEvent.interview_candidate.job;
    const stageName = interviewEvent.stage?.name || 'Technical Assessment';
    const skills = job.skills || [];
    const requirements = job.requirements || '';

    console.log(`Starting ${stageName} for candidate:`, candidate.full_name);

    // Get stage-specific config
    const stageConfig = stageConfigs[stageName] || stageConfigs['Technical Assessment'];

    // Check if questions already exist for this event
    const { data: existingResponse } = await supabase
      .from('interview_responses')
      .select('*')
      .eq('interview_event_id', interviewEvent.id)
      .single();

    if (existingResponse && existingResponse.completed_at) {
      throw new Error('This interview has already been completed');
    }

    // Handle Demo Video stage - no questions needed
    if (stageName === 'Demo Video') {
      // Create response record for video submission if not exists
      let responseRecord = existingResponse;
      if (!responseRecord) {
        const { data: newResponse, error: insertError } = await supabase
          .from('interview_responses')
          .insert({
            interview_event_id: interviewEvent.id,
            questions: [],
            total_questions: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        responseRecord = newResponse;
      }

      // Update interview event status
      await supabase
        .from('interview_events')
        .update({ status: 'in_progress' })
        .eq('id', interviewEvent.id);

      return new Response(JSON.stringify({
        success: true,
        responseId: responseRecord.id,
        questions: [],
        candidateName: candidate.full_name,
        jobTitle: job.job_title,
        stageName: stageName,
        questionType: 'video',
        timePerQuestion: 600,
        totalQuestions: 0,
        isVideoStage: true,
        videoInstructions: {
          title: 'Teaching Demo Video',
          description: 'Record a 5-10 minute teaching demonstration video',
          guidelines: [
            'Choose a topic from your subject area',
            'Demonstrate your teaching methodology',
            'Show engagement techniques you use in the classroom',
            'Speak clearly and maintain good audio quality',
            'Ensure good lighting for visibility'
          ]
        }
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (existingResponse && existingResponse.questions?.length > 0) {
      // Return existing questions
      return new Response(JSON.stringify({
        success: true,
        responseId: existingResponse.id,
        questions: existingResponse.questions,
        candidateName: candidate.full_name,
        jobTitle: job.job_title,
        stageName: stageName,
        questionType: stageConfig.questionType,
        timePerQuestion: stageConfig.timePerQuestion,
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build the prompt based on stage
    const prompt = stageConfig.promptTemplate
      .replace('{jobTitle}', job.job_title)
      .replace('{skills}', skills.join(', '))
      .replace('{requirements}', requirements) + `

The candidate applied for: ${job.job_title}
Candidate name: ${candidate.full_name}

Return ONLY a valid JSON array with this format:
[
  {
    "question": "The question text...",
    "type": "${stageConfig.questionType === 'mixed' ? 'mcq or text' : stageConfig.questionType}",
    "options": ["Option A", "Option B", "Option C", "Option D"], // only for MCQ
    "correctAnswer": 0, // index 0-3 for MCQ, null for text
    "explanation": "Brief explanation",
    "expectedLength": "short/medium/long" // only for text questions
  }
]

Generate exactly ${stageConfig.questionCount} questions.
For MCQ, correctAnswer should be the index (0-3) of the correct option.
For text questions, set options to null and correctAnswer to null.`;

    console.log(`Generating ${stageConfig.questionCount} ${stageConfig.questionType} questions for ${stageName}`);

    let questions: any[] = [];

    try {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: `You are an expert interviewer conducting the "${stageName}" round. Generate assessment questions appropriate for this stage. Always respond with valid JSON only.` 
            },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errorText);
        throw new Error(`AI API returned ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      console.log('AI Response received for', stageName);

      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    // Fallback questions based on stage
    if (!questions || questions.length === 0) {
      console.log(`Using fallback questions for ${stageName}`);
      questions = getFallbackQuestions(stageName, skills, job.job_title);
    }

    // Create interview response record
    const { data: responseRecord, error: insertError } = await supabase
      .from('interview_responses')
      .insert({
        interview_event_id: interviewEvent.id,
        questions: questions,
        total_questions: questions.length,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating response record:', insertError);
      throw insertError;
    }

    // Update interview event status
    await supabase
      .from('interview_events')
      .update({ status: 'in_progress' })
      .eq('id', interviewEvent.id);

    console.log(`${stageName} interview started successfully with ${questions.length} questions`);

    // Return questions without answers for candidate
    const sanitizedQuestions = questions.map((q: any) => ({
      question: q.question,
      type: q.type || 'mcq',
      options: q.options,
      expectedLength: q.expectedLength,
    }));

    return new Response(JSON.stringify({
      success: true,
      responseId: responseRecord.id,
      questions: sanitizedQuestions,
      candidateName: candidate.full_name,
      jobTitle: job.job_title,
      stageName: stageName,
      questionType: stageConfig.questionType,
      timePerQuestion: stageConfig.timePerQuestion,
      totalQuestions: questions.length,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error starting interview:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

// Fallback questions for different stages
function getFallbackQuestions(stageName: string, skills: string[], jobTitle: string): any[] {
  switch (stageName) {
    case 'Resume Screening':
      return [
        {
          question: "How many years of professional experience do you have?",
          type: "mcq",
          options: ["Less than 1 year", "1-3 years", "3-5 years", "More than 5 years"],
          correctAnswer: null,
          explanation: "Experience level assessment"
        },
        {
          question: "What is your highest level of education?",
          type: "mcq",
          options: ["High School", "Bachelor's Degree", "Master's Degree", "PhD or higher"],
          correctAnswer: null,
          explanation: "Education verification"
        },
        {
          question: `Which of these skills are you most proficient in for the ${jobTitle} role?`,
          type: "mcq",
          options: skills.slice(0, 4).length ? skills.slice(0, 4) : ["Technical Skills", "Communication", "Problem Solving", "Leadership"],
          correctAnswer: null,
          explanation: "Skill assessment"
        },
        {
          question: "Are you available to start within 30 days?",
          type: "mcq",
          options: ["Yes, immediately", "Within 2 weeks", "Within 30 days", "Need more than 30 days"],
          correctAnswer: null,
          explanation: "Availability check"
        },
        {
          question: "What type of work arrangement are you seeking?",
          type: "mcq",
          options: ["On-site only", "Remote only", "Hybrid", "Flexible - any arrangement"],
          correctAnswer: null,
          explanation: "Work preference"
        }
      ];

    case 'AI Phone Interview':
      return [
        {
          question: `What motivated you to apply for the ${jobTitle} position?`,
          type: "mcq",
          options: ["Career growth opportunity", "Passion for the field", "Salary and benefits", "Company reputation"],
          correctAnswer: null,
          explanation: "Understanding candidate motivation"
        },
        {
          question: "How do you stay updated with the latest developments in your field?",
          type: "mcq",
          options: ["Professional courses and certifications", "Industry publications and journals", "Networking and conferences", "All of the above"],
          correctAnswer: 3,
          explanation: "Professional development approach"
        },
        {
          question: "When faced with a challenging problem, what is your typical approach?",
          type: "mcq",
          options: ["Ask for help immediately", "Break it down and analyze systematically", "Avoid and move to easier tasks", "Work on it alone without consulting anyone"],
          correctAnswer: 1,
          explanation: "Problem-solving approach"
        },
        {
          question: "How would you handle a situation where you disagree with your supervisor's decision?",
          type: "mcq",
          options: ["Follow silently without questioning", "Express concerns respectfully and provide alternatives", "Ignore and do what you think is right", "Complain to colleagues"],
          correctAnswer: 1,
          explanation: "Professional communication skills"
        },
        {
          question: "What do you consider your greatest professional strength?",
          type: "mcq",
          options: ["Technical expertise", "Communication and teamwork", "Problem-solving ability", "Adaptability and learning"],
          correctAnswer: null,
          explanation: "Self-awareness assessment"
        },
        {
          question: "How do you prioritize when you have multiple urgent tasks?",
          type: "mcq",
          options: ["Work on the easiest task first", "Assess impact and deadlines systematically", "Ask supervisor to decide", "Work overtime to complete everything at once"],
          correctAnswer: 1,
          explanation: "Time management skills"
        },
        {
          question: "Describe your ideal work environment.",
          type: "mcq",
          options: ["Highly structured with clear guidelines", "Flexible with autonomy", "Collaborative team setting", "A mix of structure and flexibility"],
          correctAnswer: null,
          explanation: "Work preference understanding"
        },
        {
          question: "How do you handle constructive criticism?",
          type: "mcq",
          options: ["Take it personally and get defensive", "Listen, reflect, and implement improvements", "Ignore if you disagree", "Only accept from senior management"],
          correctAnswer: 1,
          explanation: "Growth mindset assessment"
        },
        {
          question: "What would you do if you realized you made a mistake that could affect the team?",
          type: "mcq",
          options: ["Hide it and hope no one notices", "Admit it immediately and work on a solution", "Blame external factors", "Wait to see if it becomes a problem"],
          correctAnswer: 1,
          explanation: "Accountability and integrity"
        },
        {
          question: "Where do you see yourself professionally in the next 2-3 years?",
          type: "mcq",
          options: ["In a leadership position", "Deepening technical expertise", "Exploring different roles", "Growing with the organization"],
          correctAnswer: null,
          explanation: "Career aspiration alignment"
        }
      ];

    case 'HR Round':
      return [
        {
          question: "Describe a situation where you had to work with a difficult team member. How did you handle it?",
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "medium",
          explanation: "Conflict resolution assessment"
        },
        {
          question: "What motivates you to apply for this position?",
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "medium",
          explanation: "Motivation assessment"
        },
        {
          question: "How do you prioritize tasks when you have multiple deadlines?",
          type: "mcq",
          options: ["First come, first served", "Based on urgency and importance", "Whatever my manager says", "I prefer to multitask on everything"],
          correctAnswer: 1,
          explanation: "Time management skills"
        },
        {
          question: "What are your salary expectations for this role?",
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "short",
          explanation: "Salary expectation"
        },
        {
          question: "Where do you see yourself in 5 years?",
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "medium",
          explanation: "Career goals assessment"
        }
      ];

    case 'Final Review':
      return [
        {
          question: `What unique value would you bring to the ${jobTitle} role?`,
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "long",
          explanation: "Value proposition"
        },
        {
          question: "Describe a significant achievement in your career and what it taught you.",
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "long",
          explanation: "Achievement assessment"
        },
        {
          question: "How do you handle feedback and criticism?",
          type: "mcq",
          options: ["I take it personally", "I listen, reflect, and improve", "I ignore it unless from my manager", "I defend my position always"],
          correctAnswer: 1,
          explanation: "Growth mindset assessment"
        },
        {
          question: "What questions do you have about our company or this role?",
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "medium",
          explanation: "Candidate interest assessment"
        }
      ];

    case 'Offer Stage':
      return [
        {
          question: "What is your expected compensation package (CTC) for this role?",
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "short",
          explanation: "Salary expectation"
        },
        {
          question: "What is your notice period at your current organization?",
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "short",
          explanation: "Notice period"
        },
        {
          question: "Do you have any pending offers or are you in the final stages with other companies?",
          type: "text",
          options: null,
          correctAnswer: null,
          expectedLength: "short",
          explanation: "Offer status"
        }
      ];

    default: // Technical Assessment
      return [
        {
          question: `What is the primary purpose of ${skills[0] || 'programming'}?`,
          type: "mcq",
          options: ["Code organization", "Performance optimization", "Error handling", "All of the above"],
          correctAnswer: 3,
          explanation: "All aspects are important in software development."
        },
        {
          question: "Which best describes good coding practices?",
          type: "mcq",
          options: ["Writing complex code", "Clear and maintainable code", "Maximum lines of code", "No comments needed"],
          correctAnswer: 1,
          explanation: "Clear and maintainable code is essential for team collaboration."
        },
        {
          question: "What is debugging?",
          type: "mcq",
          options: ["Adding new features", "Finding and fixing errors", "Deleting code", "Writing tests"],
          correctAnswer: 1,
          explanation: "Debugging is the process of finding and fixing errors in code."
        },
        {
          question: "Why is version control important?",
          type: "mcq",
          options: ["It's not important", "Track changes and collaborate", "Make code slower", "Delete old files"],
          correctAnswer: 1,
          explanation: "Version control helps track changes and enables team collaboration."
        },
        {
          question: "What does API stand for?",
          type: "mcq",
          options: ["Automated Programming Interface", "Application Programming Interface", "Advanced Protocol Integration", "Application Protocol Integration"],
          correctAnswer: 1,
          explanation: "API stands for Application Programming Interface."
        },
        {
          question: "Which data structure uses FIFO principle?",
          type: "mcq",
          options: ["Stack", "Queue", "Tree", "Graph"],
          correctAnswer: 1,
          explanation: "Queue follows First In First Out (FIFO) principle."
        },
        {
          question: "What is the time complexity of binary search?",
          type: "mcq",
          options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
          correctAnswer: 1,
          explanation: "Binary search has O(log n) time complexity."
        },
        {
          question: "What is a RESTful API?",
          type: "mcq",
          options: ["A sleeping API", "An architectural style for web services", "A database type", "A programming language"],
          correctAnswer: 1,
          explanation: "REST is an architectural style for designing networked applications."
        },
        {
          question: "Which is NOT a valid HTTP method?",
          type: "mcq",
          options: ["GET", "POST", "FETCH", "DELETE"],
          correctAnswer: 2,
          explanation: "FETCH is not an HTTP method, it's a JavaScript API."
        },
        {
          question: "What is the purpose of unit testing?",
          type: "mcq",
          options: ["Test the entire application", "Test individual components in isolation", "Test user interface only", "Test database connections"],
          correctAnswer: 1,
          explanation: "Unit testing focuses on testing individual components in isolation."
        }
      ];
  }
}
