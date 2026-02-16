// Interview Pipeline Configuration
// Maps Interview Type → Pipeline Types → Pipeline Stages

export interface PipelineStage {
  order: number;
  name: string;
  description: string;
  isAutomated: boolean;
}

export interface PipelineType {
  value: string;
  label: string;
  stages: PipelineStage[];
}

export interface InterviewTypeConfig {
  value: string;
  label: string;
  pipelineTypes: PipelineType[];
}

// Common stages used across many pipelines
const commonStages = {
  resumeScreening: { order: 1, name: 'CV/Resume', description: 'AI-powered resume analysis & scoring', isAutomated: true },
  writtenTestSlotBooking: { order: 2, name: 'Written Test Slot Booking', description: 'Candidate books Written Test slot', isAutomated: true },
  technicalAssessment: { order: 3, name: 'Written Test', description: '10 MCQ questions (90 sec each)', isAutomated: true },
  demoSlotBooking: { order: 4, name: 'Demo Slot Booking', description: 'Candidate books demo slot', isAutomated: true },
  demoRound: { order: 5, name: 'Demo Round', description: 'Live teaching/presentation demo', isAutomated: false },
  demoFeedback: { order: 6, name: 'Demo Feedback', description: 'Management review & feedback', isAutomated: false },
  hrRoundSlotBooking: { order: 7, name: 'HR Round Slot Booking', description: 'Candidate books HR round slot', isAutomated: true },
  hrRound: { order: 8, name: 'HR Round', description: 'HR interview & negotiation', isAutomated: false },
  finalReview: { order: 9, name: 'Final Review', description: 'Final evaluation & decision', isAutomated: true },
  offerStage: { order: 10, name: 'Offer Stage', description: 'Offer letter generation & sending', isAutomated: true },
};

export const interviewPipelineConfig: InterviewTypeConfig[] = [
  {
    value: 'education',
    label: 'Education (Includes Demo Video Round)',
    pipelineTypes: [
      {
        value: 'principal',
        label: 'Principal',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Leadership Assessment', description: 'Leadership & management aptitude test', isAutomated: true },
          { order: 3, name: 'Case Study', description: 'School management case study analysis', isAutomated: false },
          commonStages.demoRound,
          commonStages.demoFeedback,
          { order: 6, name: 'Board Interview', description: 'Interview with school board/trustees', isAutomated: false },
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'vice_principal',
        label: 'Vice Principal',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Academic Assessment', description: 'Academic planning & curriculum test', isAutomated: true },
          commonStages.demoSlotBooking,
          commonStages.demoRound,
          commonStages.demoFeedback,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'teacher',
        label: 'Teacher',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          commonStages.demoSlotBooking,
          commonStages.demoRound,
          commonStages.demoFeedback,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'lab_assistant',
        label: 'Lab Assistant',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Practical Assessment', description: 'Lab skills & safety test', isAutomated: true },
          commonStages.demoSlotBooking,
          commonStages.demoRound,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'librarian',
        label: 'Librarian',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Knowledge Assessment', description: 'Library science & management test', isAutomated: true },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'counselor',
        label: 'Counselor',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Psychometric Assessment', description: 'Counseling aptitude & scenario test', isAutomated: true },
          { order: 3, name: 'Role Play Round', description: 'Simulated counseling scenario', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
    ],
  },
  {
    value: 'standard',
    label: 'Standard (MCQ-based)',
    pipelineTypes: [
      {
        value: 'general',
        label: 'General',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'executive',
        label: 'Executive',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 4, name: 'Aptitude Test', description: 'Logical & analytical reasoning', isAutomated: true },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'associate',
        label: 'Associate',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.offerStage,
        ],
      },
    ],
  },
  {
    value: 'it_corporate',
    label: 'IT Corporate (Coding + MCQ)',
    pipelineTypes: [
      {
        value: 'software_engineer',
        label: 'Software Engineer',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Coding Challenge', description: 'Online coding test (2 problems)', isAutomated: true },
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 5, name: 'System Design', description: 'System design discussion', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'cybersecurity',
        label: 'Cybersecurity',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Security Assessment', description: 'Cybersecurity knowledge & threat analysis test', isAutomated: true },
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'data_ai',
        label: 'Data & Artificial Intelligence',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'SQL & Analytics Test', description: 'SQL queries, data analysis & ML concepts', isAutomated: true },
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'cloud_infrastructure',
        label: 'Cloud & Infrastructure',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Infrastructure Test', description: 'Cloud & CI/CD assessment', isAutomated: true },
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'qa_testing',
        label: 'Quality Assurance & Testing',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'QA Assessment', description: 'Testing methodologies & automation skills test', isAutomated: true },
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'product_project_management',
        label: 'Product & Project Management',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 4, name: 'Case Study', description: 'Product/project management case study', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'ui_ux_design',
        label: 'UI/UX & Design',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Design Challenge', description: 'UI/UX design task & portfolio review', isAutomated: false },
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'business_it_consulting',
        label: 'Business & IT Consulting',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 4, name: 'Strategy Presentation', description: 'IT consulting strategy & business analysis', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'it_support_operations',
        label: 'IT Support & Operations',
        stages: [
          commonStages.resumeScreening,
          { order: 2, name: 'Technical Support Test', description: 'IT support & troubleshooting assessment', isAutomated: true },
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
    ],
  },
  {
    value: 'sales',
    label: 'Sales (Presentation + MCQ)',
    pipelineTypes: [
      {
        value: 'sales_executive',
        label: 'Sales Executive',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 4, name: 'Sales Pitch', description: 'Product presentation & pitch', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'business_development',
        label: 'Business Development',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 4, name: 'Strategy Presentation', description: 'Market strategy & growth plan', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'account_manager',
        label: 'Account Manager',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 4, name: 'Client Scenario', description: 'Client management simulation', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
    ],
  },
  {
    value: 'management',
    label: 'Management (Case Study + MCQ)',
    pipelineTypes: [
      {
        value: 'project_manager',
        label: 'Project Manager',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 4, name: 'Case Study', description: 'Project management case study', isAutomated: false },
          { order: 5, name: 'Leadership Assessment', description: 'Leadership & team management', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'operations_manager',
        label: 'Operations Manager',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 4, name: 'Operations Case Study', description: 'Process optimization scenario', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'team_lead',
        label: 'Team Lead',
        stages: [
          commonStages.resumeScreening,
          commonStages.writtenTestSlotBooking,
          commonStages.technicalAssessment,
          { order: 4, name: 'Team Scenario', description: 'Team conflict & management scenario', isAutomated: false },
          commonStages.hrRoundSlotBooking,
          commonStages.hrRound,
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
    ],
  },
  {
    value: 'legal',
    label: 'Legal (Instruction + Written + Management Meet)',
    pipelineTypes: [
      {
        value: 'legal_advisor',
        label: 'Legal Advisor',
        stages: [
          { order: 1, name: 'Instruction Mail', description: 'Send instruction email with guidelines & requirements', isAutomated: true },
          commonStages.writtenTestSlotBooking,
          { order: 3, name: 'Written Test', description: 'Legal knowledge & case law assessment', isAutomated: true },
          { order: 4, name: 'Management Meet', description: 'Live meeting with management (manual link + observer)', isAutomated: false },
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'legal_officer',
        label: 'Legal Officer',
        stages: [
          { order: 1, name: 'Instruction Mail', description: 'Send instruction email with guidelines & requirements', isAutomated: true },
          commonStages.writtenTestSlotBooking,
          { order: 3, name: 'Written Test', description: 'Legal compliance & regulatory assessment', isAutomated: true },
          { order: 4, name: 'Management Meet', description: 'Live meeting with management (manual link + observer)', isAutomated: false },
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
      {
        value: 'compliance_manager',
        label: 'Compliance Manager',
        stages: [
          { order: 1, name: 'Instruction Mail', description: 'Send instruction email with guidelines & requirements', isAutomated: true },
          commonStages.writtenTestSlotBooking,
          { order: 3, name: 'Written Test', description: 'Compliance framework & risk assessment', isAutomated: true },
          { order: 4, name: 'Management Meet', description: 'Live meeting with management (manual link + observer)', isAutomated: false },
          commonStages.finalReview,
          commonStages.offerStage,
        ],
      },
    ],
  },
];

export const getPipelineTypesForInterviewType = (interviewType: string): PipelineType[] => {
  const config = interviewPipelineConfig.find(c => c.value === interviewType);
  return config?.pipelineTypes || [];
};

export const getPipelineStages = (interviewType: string, pipelineType: string): PipelineStage[] => {
  const types = getPipelineTypesForInterviewType(interviewType);
  const pipeline = types.find(t => t.value === pipelineType);
  return pipeline?.stages || [];
};
