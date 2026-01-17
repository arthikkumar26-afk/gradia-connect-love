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
    questionCount: 10,
    questionType: 'mcq',
    timePerQuestion: 90,
    promptTemplate: `Generate 10 technical MCQ questions for a {jobTitle} position.
Skills required: {skills}
Requirements: {requirements}

Focus on:
- Core technical concepts and knowledge
- Problem-solving abilities
- Best practices and design patterns
- Real-world scenario questions

Make questions progressively harder from basic to advanced.
This is the primary technical assessment round to evaluate the candidate's technical skills.`
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
    questionCount: 0,
    questionType: 'video', // Using video type to indicate manual/meeting stage
    timePerQuestion: 0,
    promptTemplate: `This is a manual interview stage - no AI questions needed. The candidate will attend a live meeting with the interviewer.`
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

    // Get candidate's segment, category, class_level, and designation from profile
    const candidateSegment = candidate.segment;
    const candidateCategory = candidate.category;
    const candidateDesignation = candidate.preferred_role || candidate.primary_subject;
    // For class level matching, we'll check the slot_bookings table or profile data
    // Get class level from the candidate's most recent slot booking if available
    let candidateClassLevel: string | null = null;
    
    // Try to get class_level from recent slot booking
    const { data: recentBooking } = await supabase
      .from('slot_bookings')
      .select('class_level')
      .eq('candidate_id', interviewEvent.interview_candidate.candidate_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (recentBooking?.class_level) {
      candidateClassLevel = recentBooking.class_level;
    }

    console.log(`Candidate profile - Segment: ${candidateSegment}, Category: ${candidateCategory}, Class: ${candidateClassLevel}, Designation: ${candidateDesignation}`);

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

    let questions: any[] = [];
    let usingAdminQuestions = false;

    // FIRST: Try to fetch questions from admin-uploaded question papers
    // Match based on candidate's segment, category, class_level, and designation
    if (candidateSegment || candidateCategory || candidateDesignation || candidateClassLevel) {
      console.log('Searching for admin-uploaded question papers matching candidate profile...');
      
      // Build query to find matching question paper
      let query = supabase
        .from('interview_question_papers')
        .select(`
          *,
          interview_questions(
            *,
            interview_answer_keys(*)
          )
        `)
        .eq('is_active', true);

      // Add filters based on available candidate data
      if (candidateSegment) {
        query = query.eq('segment', candidateSegment);
      }
      if (candidateCategory) {
        query = query.eq('category', candidateCategory);
      }
      if (candidateClassLevel) {
        query = query.eq('class_level', candidateClassLevel);
      }
      if (candidateDesignation) {
        query = query.eq('designation', candidateDesignation);
      }

      const { data: matchingPapers, error: paperError } = await query.limit(5);

      if (paperError) {
        console.error('Error fetching question papers:', paperError);
      } else if (matchingPapers && matchingPapers.length > 0) {
        console.log(`Found ${matchingPapers.length} matching question papers from admin uploads`);
        
        // Randomly select one paper if multiple matches
        const selectedPaper = matchingPapers[Math.floor(Math.random() * matchingPapers.length)];
        console.log(`Selected paper: ${selectedPaper.title} (ID: ${selectedPaper.id})`);

        const paperQuestions = selectedPaper.interview_questions || [];
        
        if (paperQuestions.length > 0) {
          // Transform admin questions to interview format
          questions = paperQuestions.map((q: any) => {
            const answerKey = q.interview_answer_keys?.[0];
            
            return {
              question: q.question_text,
              type: q.question_type === 'multiple_choice' ? 'mcq' : q.question_type,
              options: q.options?.options || q.options || [],
              correctAnswer: answerKey?.answer_text ? 
                (q.options?.options || q.options || []).findIndex(
                  (opt: string) => opt.toLowerCase().includes(answerKey.answer_text.toLowerCase().charAt(0))
                ) : 0,
              explanation: answerKey?.answer_text || 'Correct answer based on the answer key.',
              questionId: q.id,
              marks: q.marks || 1
            };
          });

          usingAdminQuestions = true;
          console.log(`Loaded ${questions.length} questions from admin-uploaded paper`);
        }
      } else {
        console.log('No matching question papers found for candidate profile. Falling back to AI generation.');
      }
    }

    // FALLBACK: Generate questions via AI if no admin questions found
    if (!usingAdminQuestions || questions.length === 0) {
      // Build the prompt based on stage
      const prompt = stageConfig.promptTemplate
        .replace('{jobTitle}', job.job_title)
        .replace('{skills}', skills.join(', '))
        .replace('{requirements}', requirements) + `

The candidate applied for: ${job.job_title}
Candidate name: ${candidate.full_name}

CRITICAL: Return ONLY a valid JSON array. Each question MUST have these exact fields:
[
  {
    "question": "A clear, standalone question WITHOUT option letters (A/B/C/D) embedded in the text",
    "type": "mcq",
    "options": ["First complete option text", "Second complete option text", "Third complete option text", "Fourth complete option text"],
    "correctAnswer": 0,
    "explanation": "Why this is correct"
  }
]

IMPORTANT RULES:
1. The "question" field should ONLY contain the question text, NOT the options
2. The "options" array must contain 4 COMPLETE answer options as full sentences
3. Do NOT put A), B), C), D) prefixes in the options array
4. The "correctAnswer" is the index (0, 1, 2, or 3) of the correct option
5. Generate exactly ${stageConfig.questionCount} questions

EXAMPLE of CORRECT format:
{
  "question": "What is the most effective classroom management technique?",
  "type": "mcq", 
  "options": [
    "Establishing clear expectations and routines from day one",
    "Ignoring disruptive behavior completely",
    "Using only punitive measures for discipline",
    "Allowing students to set all classroom rules without guidance"
  ],
  "correctAnswer": 0,
  "explanation": "Clear expectations and routines help prevent behavioral issues"
}`;

      console.log(`Generating ${stageConfig.questionCount} ${stageConfig.questionType} questions for ${stageName} via AI`);

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
                content: `You are an expert interviewer conducting the "${stageName}" round. Generate assessment questions appropriate for this stage. 

CRITICAL: You MUST return a valid JSON array where:
- Each question's "question" field contains ONLY the question text (no A/B/C/D options embedded)
- Each question's "options" array contains 4 complete answer choices as full text
- Response must be valid JSON only, no markdown formatting.` 
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
            const parsedQuestions = JSON.parse(jsonMatch[0]);
            
            // Validate and clean questions
            questions = parsedQuestions.map((q: any) => {
              // Check if options are just letters like ["A", "B", "C", "D"]
              const hasInvalidOptions = q.options?.every((opt: string) => 
                typeof opt === 'string' && opt.length <= 2
              );
              
              if (hasInvalidOptions || !q.options || q.options.length !== 4) {
                console.log('Invalid question format detected, skipping:', q.question?.substring(0, 50));
                return null; // Will be filtered out
              }
              
              return {
                question: q.question,
                type: q.type || 'mcq',
                options: q.options.map((opt: string) => 
                  opt.replace(/^[A-D]\)\s*/i, '').replace(/^[A-D]\.\s*/i, '').trim()
                ),
                correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
                explanation: q.explanation || 'Correct answer based on best practices.'
              };
            }).filter(Boolean);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
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
      // Technical MCQ questions for Resume Screening stage
      return [
        {
          question: `Which of the following best describes a key responsibility in a ${jobTitle} role?`,
          type: "mcq",
          options: ["Managing daily operations", "Developing technical solutions", "Handling customer complaints", "All of the above depending on context"],
          correctAnswer: 3,
          explanation: "Role responsibilities vary based on context"
        },
        {
          question: "What is the most effective approach to problem-solving in a professional environment?",
          type: "mcq",
          options: ["Jump to solutions immediately", "Analyze the problem, identify root causes, then develop solutions", "Wait for someone else to solve it", "Avoid the problem if possible"],
          correctAnswer: 1,
          explanation: "Systematic problem-solving is most effective"
        },
        {
          question: "When working on a complex project, which is the most important first step?",
          type: "mcq",
          options: ["Start coding immediately", "Define clear requirements and objectives", "Ask a colleague to help", "Skip planning and figure it out later"],
          correctAnswer: 1,
          explanation: "Clear requirements are essential for project success"
        },
        {
          question: "What is the best practice for handling tight deadlines?",
          type: "mcq",
          options: ["Work overtime every day", "Prioritize tasks and communicate proactively", "Compromise on quality", "Ignore less important tasks"],
          correctAnswer: 1,
          explanation: "Prioritization and communication are key to deadline management"
        },
        {
          question: "In a team environment, what is the most important factor for success?",
          type: "mcq",
          options: ["Working independently", "Clear communication and collaboration", "Competing with teammates", "Avoiding conflicts at all costs"],
          correctAnswer: 1,
          explanation: "Communication and collaboration drive team success"
        },
        {
          question: "What approach should you take when learning a new technology or skill?",
          type: "mcq",
          options: ["Wait until someone teaches you", "Practice hands-on with documentation and projects", "Only learn what's absolutely necessary", "Avoid new technologies"],
          correctAnswer: 1,
          explanation: "Hands-on practice is the most effective learning method"
        },
        {
          question: "How should you handle feedback from supervisors or peers?",
          type: "mcq",
          options: ["Ignore it if you disagree", "Listen, reflect, and implement improvements", "Argue to defend your position", "Only accept positive feedback"],
          correctAnswer: 1,
          explanation: "Constructive feedback helps professional growth"
        },
        {
          question: "What is the most important quality for continuous professional development?",
          type: "mcq",
          options: ["Having many certifications", "Curiosity and willingness to learn", "Only focusing on current job requirements", "Avoiding challenging tasks"],
          correctAnswer: 1,
          explanation: "Curiosity drives continuous improvement"
        },
        {
          question: "When faced with an unfamiliar problem, what is the best approach?",
          type: "mcq",
          options: ["Give up immediately", "Research, analyze, and try different solutions", "Wait for instructions", "Blame external factors"],
          correctAnswer: 1,
          explanation: "Research and analysis help solve unfamiliar problems"
        },
        {
          question: "What makes a professional stand out in their career?",
          type: "mcq",
          options: ["Only doing what's asked", "Taking initiative and exceeding expectations", "Staying in comfort zone", "Avoiding responsibility"],
          correctAnswer: 1,
          explanation: "Initiative and excellence lead to career growth"
        }
      ];

    case 'Technical Assessment':
      // This is now a manual interview stage - return empty for MCQ
      return [];

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
