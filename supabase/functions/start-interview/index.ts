import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const skills = job.skills || [];

    console.log('Generating questions for skills:', skills);

    // Check if questions already exist for this event
    const { data: existingResponse } = await supabase
      .from('interview_responses')
      .select('*')
      .eq('interview_event_id', interviewEvent.id)
      .single();

    if (existingResponse && existingResponse.completed_at) {
      throw new Error('This interview has already been completed');
    }

    if (existingResponse && existingResponse.questions?.length > 0) {
      // Return existing questions
      return new Response(JSON.stringify({
        success: true,
        responseId: existingResponse.id,
        questions: existingResponse.questions,
        candidateName: candidate.full_name,
        jobTitle: job.job_title,
        stageName: interviewEvent.stage?.name || 'First Round',
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate MCQ questions using Lovable AI
    const prompt = `Generate exactly 5 multiple choice questions to assess a candidate's skills in: ${skills.join(', ')}.
    
The candidate applied for: ${job.job_title}
Job requirements: ${job.requirements || 'General technical skills'}

For each question, provide:
1. A clear technical question relevant to the skills
2. Exactly 4 options (A, B, C, D)
3. The correct answer letter
4. Brief explanation of why it's correct

Return ONLY a valid JSON array with this exact format:
[
  {
    "question": "What is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation"
  }
]

The correctAnswer should be the index (0-3) of the correct option.
Make questions progressively harder. Focus on practical knowledge.`;

    let questions = [];
    let aiError = null;

    try {
      const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a technical interviewer generating assessment questions. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errorText);
        aiError = `AI API returned ${aiResponse.status}`;
      } else {
        const aiData = await aiResponse.json();
        console.log('AI Response received');

        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          // Extract JSON from response (handle markdown code blocks)
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            questions = JSON.parse(jsonMatch[0]);
          }
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'aiError:', aiError);
      // Fallback to generic questions
      questions = [
        {
          question: `What is the primary purpose of ${skills[0] || 'programming'}?`,
          options: ["Code organization", "Performance optimization", "Error handling", "All of the above"],
          correctAnswer: 3,
          explanation: "All aspects are important in software development."
        },
        {
          question: "Which best describes good coding practices?",
          options: ["Writing complex code", "Clear and maintainable code", "Maximum lines of code", "No comments needed"],
          correctAnswer: 1,
          explanation: "Clear and maintainable code is essential for team collaboration."
        },
        {
          question: "What is debugging?",
          options: ["Adding new features", "Finding and fixing errors", "Deleting code", "Writing tests"],
          correctAnswer: 1,
          explanation: "Debugging is the process of finding and fixing errors in code."
        },
        {
          question: "Why is version control important?",
          options: ["It's not important", "Track changes and collaborate", "Make code slower", "Delete old files"],
          correctAnswer: 1,
          explanation: "Version control helps track changes and enables team collaboration."
        },
        {
          question: "What does API stand for?",
          options: ["Automated Programming Interface", "Application Programming Interface", "Advanced Protocol Integration", "Application Protocol Integration"],
          correctAnswer: 1,
          explanation: "API stands for Application Programming Interface."
        }
      ];
    }

    // Ensure we have questions before proceeding
    if (!questions || questions.length === 0) {
      console.error('No questions generated, using fallback');
      questions = [
        {
          question: `What is the primary purpose of ${skills[0] || 'programming'}?`,
          options: ["Code organization", "Performance optimization", "Error handling", "All of the above"],
          correctAnswer: 3,
          explanation: "All aspects are important in software development."
        },
        {
          question: "Which best describes good coding practices?",
          options: ["Writing complex code", "Clear and maintainable code", "Maximum lines of code", "No comments needed"],
          correctAnswer: 1,
          explanation: "Clear and maintainable code is essential for team collaboration."
        },
        {
          question: "What is debugging?",
          options: ["Adding new features", "Finding and fixing errors", "Deleting code", "Writing tests"],
          correctAnswer: 1,
          explanation: "Debugging is the process of finding and fixing errors in code."
        },
        {
          question: "Why is version control important?",
          options: ["It's not important", "Track changes and collaborate", "Make code slower", "Delete old files"],
          correctAnswer: 1,
          explanation: "Version control helps track changes and enables team collaboration."
        },
        {
          question: "What does API stand for?",
          options: ["Automated Programming Interface", "Application Programming Interface", "Advanced Protocol Integration", "Application Protocol Integration"],
          correctAnswer: 1,
          explanation: "API stands for Application Programming Interface."
        }
      ];
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

    console.log('Interview started successfully');

    return new Response(JSON.stringify({
      success: true,
      responseId: responseRecord.id,
      questions: questions.map((q: any) => ({
        question: q.question,
        options: q.options,
      })),
      candidateName: candidate.full_name,
      jobTitle: job.job_title,
      stageName: interviewEvent.stage?.name || 'First Round',
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
