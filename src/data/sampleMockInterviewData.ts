// Sample mock interview data for PDF export and demo mode
// Stage names MUST match the edge function definitions in process-mock-interview-stage

export const getSampleMockInterviewSession = () => ({
  id: 'sample-session-001',
  status: 'completed',
  current_stage_order: 6,
  overall_score: 72,
  overall_feedback: 'Selected for Next Round',
  completed_at: new Date().toISOString(),
  started_at: new Date(Date.now() - 3600000).toISOString(),
});

export const getSampleMockInterviewStageResults = (sessionId: string) => [
  {
    id: 'sample-result-001',
    session_id: sessionId,
    stage_name: 'Interview Instructions',
    stage_order: 1,
    ai_score: 100,
    ai_feedback: 'Interview instructions received and acknowledged successfully via email.',
    passed: true,
    strengths: ['Successfully received all interview guidelines', 'Acknowledged the interview process'],
    improvements: [],
    completed_at: new Date(Date.now() - 3500000).toISOString(),
    time_taken_seconds: 120,
  },
  {
    id: 'sample-result-002',
    session_id: sessionId,
    stage_name: 'Technical Assessment',
    stage_order: 2,
    ai_score: 75,
    ai_feedback: 'Demonstrated good foundational knowledge in the subject area. Answers were well-structured and showed understanding of core concepts. Could improve on advanced topics and real-world application examples.',
    passed: true,
    strengths: [
      'Strong understanding of fundamental concepts',
      'Clear and structured responses',
      'Good use of relevant terminology',
      'Demonstrated practical knowledge in core areas'
    ],
    improvements: [
      'Expand knowledge on advanced topics and recent developments',
      'Include more real-world examples and case studies in answers',
      'Work on providing more detailed explanations for complex concepts',
      'Practice answering questions within time constraints'
    ],
    completed_at: new Date(Date.now() - 3000000).toISOString(),
    time_taken_seconds: 1200,
  },
  {
    id: 'sample-result-003',
    session_id: sessionId,
    stage_name: 'Demo Round',
    stage_order: 3,
    ai_score: 68,
    ai_feedback: 'The demonstration showed good subject knowledge and teaching ability. Voice modulation and classroom engagement techniques need improvement. The lesson plan was well-organized but could include more interactive elements.',
    passed: true,
    strengths: [
      'Well-organized lesson structure with clear objectives',
      'Good subject knowledge evident in explanations',
      'Effective use of examples to illustrate concepts',
      'Maintained a professional demeanor throughout'
    ],
    improvements: [
      'Improve voice modulation and projection for better engagement',
      'Incorporate more interactive teaching methods (Q&A, activities)',
      'Better time management during demonstration segments',
      'Use visual aids and multimedia to enhance learning experience',
      'Practice transitioning between topics more smoothly'
    ],
    completed_at: new Date(Date.now() - 2400000).toISOString(),
    time_taken_seconds: 900,
  },
  {
    id: 'sample-result-004',
    session_id: sessionId,
    stage_name: 'Demo Feedback',
    stage_order: 4,
    ai_score: 70,
    ai_feedback: 'Demo feedback reviewed. Performance indicates a promising candidate with good foundational skills. Recommended for further training in advanced teaching methodologies and classroom management techniques.',
    passed: true,
    strengths: [
      'Professional attitude and willingness to learn',
      'Good communication skills with clear articulation',
      'Demonstrated passion for teaching',
      'Responsive to feedback and suggestions'
    ],
    improvements: [
      'Develop advanced classroom management strategies',
      'Build stronger student engagement techniques',
      'Enhance technology integration in teaching',
      'Work on developing a personal teaching philosophy'
    ],
    completed_at: new Date(Date.now() - 1800000).toISOString(),
    time_taken_seconds: 600,
  },
  {
    id: 'sample-result-005',
    session_id: sessionId,
    stage_name: 'Final Review (HR)',
    stage_order: 5,
    ai_score: 80,
    ai_feedback: 'Salary expectations are within the acceptable range. Candidate showed flexibility in joining date and relocation preferences. Good negotiation approach. All required HR documents submitted and verified successfully.',
    passed: true,
    strengths: [
      'Realistic salary expectations aligned with market standards',
      'Flexible on joining timeline',
      'Open to relocation if required',
      'Professional negotiation approach',
      'All documents submitted on time'
    ],
    improvements: [
      'Research industry salary benchmarks for better positioning',
      'Prepare specific accomplishments to justify salary expectations',
      'Consider additional benefits beyond base salary'
    ],
    completed_at: new Date(Date.now() - 600000).toISOString(),
    time_taken_seconds: 450,
  },
  {
    id: 'sample-result-006',
    session_id: sessionId,
    stage_name: 'All Reviews',
    stage_order: 6,
    ai_score: 72,
    ai_feedback: 'Overall, the candidate has shown good potential with solid fundamentals. Performance across all stages indicates readiness for the role with additional training. Recommended for onboarding with a structured development plan.',
    passed: true,
    strengths: [
      'Consistent performance across all interview stages',
      'Strong subject matter expertise in core areas',
      'Good interpersonal and communication skills',
      'Demonstrated commitment and enthusiasm for the role'
    ],
    improvements: [
      'Continue developing advanced teaching methodologies',
      'Pursue professional development courses for skill enhancement',
      'Work on building a portfolio of teaching resources',
      'Develop assessment and evaluation skills',
      'Explore Skillory courses for targeted skill improvement'
    ],
    completed_at: new Date().toISOString(),
    time_taken_seconds: 240,
  },
];
