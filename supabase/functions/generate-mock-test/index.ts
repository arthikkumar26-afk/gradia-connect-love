import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateProfile, sessionId } = await req.json();
    console.log('Generating mock test for candidate:', candidateProfile?.full_name);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const subject = candidateProfile?.primary_subject || 'general teaching';
    const role = candidateProfile?.preferred_role || 'teacher';
    const experience = candidateProfile?.experience_level || 'fresher';

    const prompt = `Generate exactly 10 multiple choice questions for a mock interview test for an education sector candidate with the following profile:
- Primary Subject: ${subject}
- Preferred Role: ${role}
- Experience Level: ${experience}

The questions should be a mix of:
- Subject knowledge (${subject}) - 4 questions
- Teaching methodology and pedagogy - 3 questions
- Classroom management and communication - 3 questions

For each question, provide:
1. The question text
2. Four options (A, B, C, D)
3. The correct answer (just the letter)
4. A brief explanation of why that answer is correct

Return the response as a JSON array with this exact structure:
[
  {
    "id": 1,
    "question": "Question text here",
    "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
    "correctAnswer": "A",
    "explanation": "Brief explanation here",
    "category": "Subject Knowledge"
  }
]

Only return the JSON array, no additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert education assessment specialist. Generate high-quality multiple choice questions for teacher interviews. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let questions;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Generate fallback questions
      questions = generateFallbackQuestions(subject);
    }

    console.log('Generated', questions.length, 'questions');

    return new Response(JSON.stringify({ questions, sessionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in generate-mock-test:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackQuestions(subject: string) {
  return [
    {
      id: 1,
      question: "What is the most effective teaching method for engaging students in active learning?",
      options: ["A) Lecture-based instruction", "B) Project-based learning", "C) Rote memorization", "D) Silent reading"],
      correctAnswer: "B",
      explanation: "Project-based learning encourages active participation and critical thinking.",
      category: "Teaching Methodology"
    },
    {
      id: 2,
      question: "How should a teacher handle a disruptive student in the classroom?",
      options: ["A) Ignore the behavior", "B) Send them out immediately", "C) Address privately and understand the cause", "D) Publicly reprimand"],
      correctAnswer: "C",
      explanation: "Addressing privately helps maintain dignity while understanding the root cause.",
      category: "Classroom Management"
    },
    {
      id: 3,
      question: "What is formative assessment primarily used for?",
      options: ["A) Final grading", "B) Monitoring student progress during learning", "C) Comparing students", "D) School ranking"],
      correctAnswer: "B",
      explanation: "Formative assessment helps track ongoing progress and adjust teaching.",
      category: "Teaching Methodology"
    },
    {
      id: 4,
      question: "Which approach best supports differentiated instruction?",
      options: ["A) Same content for all students", "B) Varying content, process, or product based on student needs", "C) Teaching to the average student", "D) Focusing only on advanced students"],
      correctAnswer: "B",
      explanation: "Differentiated instruction adapts to individual student needs and abilities.",
      category: "Teaching Methodology"
    },
    {
      id: 5,
      question: "What is the primary purpose of a lesson plan?",
      options: ["A) To satisfy administration", "B) To organize teaching objectives and activities", "C) To fill time", "D) To copy from textbooks"],
      correctAnswer: "B",
      explanation: "Lesson plans help organize teaching for effective learning outcomes.",
      category: "Teaching Methodology"
    },
    {
      id: 6,
      question: "How can technology best enhance classroom learning?",
      options: ["A) Replace all traditional methods", "B) As a supplementary tool to engage students", "C) Only for entertainment", "D) To reduce teacher workload"],
      correctAnswer: "B",
      explanation: "Technology works best as a supplement to enhance engagement and learning.",
      category: "Teaching Methodology"
    },
    {
      id: 7,
      question: "What is the key to effective parent-teacher communication?",
      options: ["A) Only during problems", "B) Regular, proactive, and constructive communication", "C) Written reports only", "D) Avoiding difficult conversations"],
      correctAnswer: "B",
      explanation: "Regular proactive communication builds trust and supports student success.",
      category: "Communication"
    },
    {
      id: 8,
      question: "Which classroom seating arrangement best promotes group discussion?",
      options: ["A) Traditional rows", "B) Circular or U-shaped arrangement", "C) Individual desks spread apart", "D) Back-to-back seating"],
      correctAnswer: "B",
      explanation: "Circular arrangements facilitate eye contact and group interaction.",
      category: "Classroom Management"
    },
    {
      id: 9,
      question: "What is Bloom's Taxonomy primarily used for?",
      options: ["A) Grading students", "B) Classifying educational learning objectives", "C) Arranging classroom", "D) Parent meetings"],
      correctAnswer: "B",
      explanation: "Bloom's Taxonomy helps classify and structure learning objectives.",
      category: "Teaching Methodology"
    },
    {
      id: 10,
      question: "How should a teacher respond to a student who consistently struggles with the material?",
      options: ["A) Lower expectations", "B) Provide additional support and alternative approaches", "C) Compare with other students", "D) Recommend they change subjects"],
      correctAnswer: "B",
      explanation: "Additional support and varied approaches help struggling students succeed.",
      category: "Student Support"
    }
  ];
}
