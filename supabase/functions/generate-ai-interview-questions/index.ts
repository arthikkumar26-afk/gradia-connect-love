import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, interviewCandidateId, questionCount = 5 } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    // Fetch candidate profile if available
    let candidateProfile = null;
    if (interviewCandidateId) {
      const { data: interviewCandidate } = await supabase
        .from("interview_candidates")
        .select(`
          *,
          profiles:candidate_id (
            full_name,
            experience_level,
            preferred_role,
            primary_subject,
            segment
          )
        `)
        .eq("id", interviewCandidateId)
        .single();
      
      candidateProfile = interviewCandidate?.profiles;
    }

    const systemPrompt = `You are a senior technical interviewer. Generate ${questionCount} technical interview questions for a ${job.job_title} position.

Job Details:
- Title: ${job.job_title}
- Department: ${job.department || "N/A"}
- Required Skills: ${job.skills?.join(", ") || "N/A"}
- Experience Required: ${job.experience_required || "N/A"}
- Description: ${job.description || "N/A"}

${candidateProfile ? `
Candidate Background:
- Experience Level: ${candidateProfile.experience_level || "N/A"}
- Preferred Role: ${candidateProfile.preferred_role || "N/A"}
- Subject: ${candidateProfile.primary_subject || "N/A"}
` : ""}

Generate questions that:
1. Test technical knowledge relevant to the role
2. Include a mix of conceptual and practical questions
3. Range from basic to advanced difficulty
4. Can be answered verbally in 2-3 minutes each

Return ONLY a valid JSON array of questions in this exact format:
[
  {
    "id": 1,
    "question": "Question text here",
    "category": "Technical/Conceptual/Practical",
    "difficulty": "Easy/Medium/Hard",
    "expectedDuration": 120,
    "keyPoints": ["key point 1", "key point 2"]
  }
]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${questionCount} technical interview questions for this ${job.job_title} position.` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from the response
    let questions;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      questions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse questions:", parseError, content);
      // Fallback questions
      questions = [
        {
          id: 1,
          question: `Tell me about your experience relevant to the ${job.job_title} role.`,
          category: "General",
          difficulty: "Easy",
          expectedDuration: 120,
          keyPoints: ["Relevant experience", "Key achievements"]
        },
        {
          id: 2,
          question: "Describe a challenging technical problem you solved recently.",
          category: "Technical",
          difficulty: "Medium",
          expectedDuration: 180,
          keyPoints: ["Problem identification", "Solution approach", "Outcome"]
        },
        {
          id: 3,
          question: "How do you stay updated with the latest developments in your field?",
          category: "Professional",
          difficulty: "Easy",
          expectedDuration: 120,
          keyPoints: ["Learning methods", "Industry awareness"]
        }
      ];
    }

    // Create or update AI interview session
    if (interviewCandidateId) {
      const { data: existingSession } = await supabase
        .from("ai_interview_sessions")
        .select("id")
        .eq("interview_candidate_id", interviewCandidateId)
        .single();

      if (existingSession) {
        await supabase
          .from("ai_interview_sessions")
          .update({
            questions,
            status: "pending",
            updated_at: new Date().toISOString()
          })
          .eq("id", existingSession.id);
      } else {
        await supabase
          .from("ai_interview_sessions")
          .insert({
            interview_candidate_id: interviewCandidateId,
            job_id: jobId,
            questions,
            status: "pending"
          });
      }
    }

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error generating questions:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
