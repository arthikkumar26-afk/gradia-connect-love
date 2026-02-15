// Dynamic form field options based on Interview Type

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface DynamicFormFieldConfig {
  name: string;
  label: string;
  type: 'select' | 'text' | 'multiselect';
  placeholder: string;
  options?: FormFieldOption[];
  required?: boolean;
  helpText?: string;
}

export interface InterviewTypeFormConfig {
  interviewType: string;
  fields: DynamicFormFieldConfig[];
  jobTitlePlaceholder: string;
  departmentLabel: string;
  departmentPlaceholder: string;
  skillsPlaceholder: string;
  experienceOptions: FormFieldOption[];
  jobTypeOptions: FormFieldOption[];
  salaryPlaceholder: string;
}

// ─── Education ───
const educationConfig: InterviewTypeFormConfig = {
  interviewType: 'education',
  jobTitlePlaceholder: 'e.g., PGT Mathematics Teacher',
  departmentLabel: 'Subject',
  departmentPlaceholder: 'e.g., Mathematics',
  skillsPlaceholder: 'e.g., Classroom Management, Lesson Planning, Smart Board',
  salaryPlaceholder: 'e.g., ₹3-6 LPA',
  experienceOptions: [
    { value: 'Fresher', label: 'Fresher' },
    { value: '0-1 years', label: '0-1 years' },
    { value: '1-3 years', label: '1-3 years' },
    { value: '3-5 years', label: '3-5 years' },
    { value: '5-10 years', label: '5-10 years' },
    { value: '10+ years', label: '10+ years (Senior)' },
  ],
  jobTypeOptions: [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract / Visiting' },
    { value: 'Temporary', label: 'Temporary' },
  ],
  fields: [
    {
      name: 'segment',
      label: 'Segment / Board *',
      type: 'select',
      placeholder: 'Select board or segment',
      required: true,
      helpText: 'The education board or curriculum the school follows',
      options: [
        { value: 'CBSE', label: 'CBSE' },
        { value: 'ICSE', label: 'ICSE / ISC' },
        { value: 'State Board', label: 'State Board' },
        { value: 'IB', label: 'IB (International Baccalaureate)' },
        { value: 'Cambridge', label: 'Cambridge (IGCSE)' },
        { value: 'Montessori', label: 'Montessori' },
        { value: 'Waldorf', label: 'Waldorf / Steiner' },
        { value: 'Play School', label: 'Play School / Pre-School' },
        { value: 'Other', label: 'Other' },
      ],
    },
    {
      name: 'class_level',
      label: 'Class Level *',
      type: 'select',
      placeholder: 'Select class level',
      required: true,
      helpText: 'The grade range for this position',
      options: [
        { value: 'Pre-Primary', label: 'Pre-Primary (Nursery - UKG)' },
        { value: 'Primary', label: 'Primary (Class 1-5)' },
        { value: 'Middle', label: 'Middle School (Class 6-8)' },
        { value: 'Secondary', label: 'Secondary (Class 9-10)' },
        { value: 'Senior Secondary', label: 'Senior Secondary (Class 11-12)' },
        { value: 'All Levels', label: 'All Levels' },
      ],
    },
    {
      name: 'designation',
      label: 'Designation *',
      type: 'select',
      placeholder: 'Select designation',
      required: true,
      options: [
        { value: 'PRT', label: 'PRT (Primary Teacher)' },
        { value: 'TGT', label: 'TGT (Trained Graduate Teacher)' },
        { value: 'PGT', label: 'PGT (Post Graduate Teacher)' },
        { value: 'Head Teacher', label: 'Head Teacher / HoD' },
        { value: 'Vice Principal', label: 'Vice Principal' },
        { value: 'Principal', label: 'Principal' },
        { value: 'Coordinator', label: 'Academic Coordinator' },
        { value: 'Counselor', label: 'Counselor' },
        { value: 'Librarian', label: 'Librarian' },
        { value: 'Lab Assistant', label: 'Lab Assistant' },
        { value: 'Sports Coach', label: 'Sports Coach / PET' },
        { value: 'Special Educator', label: 'Special Educator' },
      ],
    },
    {
      name: 'qualification',
      label: 'Required Qualification',
      type: 'select',
      placeholder: 'Select minimum qualification',
      options: [
        { value: 'D.El.Ed', label: 'D.El.Ed / D.Ed' },
        { value: 'B.Ed', label: 'B.Ed' },
        { value: 'M.Ed', label: 'M.Ed' },
        { value: 'B.A + B.Ed', label: 'B.A + B.Ed' },
        { value: 'M.A + B.Ed', label: 'M.A + B.Ed' },
        { value: 'B.Sc + B.Ed', label: 'B.Sc + B.Ed' },
        { value: 'M.Sc + B.Ed', label: 'M.Sc + B.Ed' },
        { value: 'Ph.D', label: 'Ph.D / Doctorate' },
        { value: 'NTT', label: 'NTT (Nursery Teacher Training)' },
        { value: 'Any Graduate', label: 'Any Graduate' },
      ],
    },
    {
      name: 'medium_of_instruction',
      label: 'Medium of Instruction',
      type: 'select',
      placeholder: 'Select medium',
      options: [
        { value: 'English', label: 'English Medium' },
        { value: 'Hindi', label: 'Hindi Medium' },
        { value: 'Telugu', label: 'Telugu Medium' },
        { value: 'Tamil', label: 'Tamil Medium' },
        { value: 'Kannada', label: 'Kannada Medium' },
        { value: 'Marathi', label: 'Marathi Medium' },
        { value: 'Bengali', label: 'Bengali Medium' },
        { value: 'Bilingual', label: 'Bilingual' },
        { value: 'Other', label: 'Other' },
      ],
    },
  ],
};

// ─── IT Corporate ───
const itCorporateConfig: InterviewTypeFormConfig = {
  interviewType: 'it_corporate',
  jobTitlePlaceholder: 'e.g., Senior Full Stack Developer',
  departmentLabel: 'Department',
  departmentPlaceholder: 'e.g., Engineering',
  skillsPlaceholder: 'e.g., React, Node.js, TypeScript, AWS, Docker',
  salaryPlaceholder: 'e.g., ₹12-20 LPA',
  experienceOptions: [
    { value: 'Fresher', label: 'Fresher / Intern' },
    { value: '0-1 years', label: '0-1 years (Entry Level)' },
    { value: '1-3 years', label: '1-3 years (Junior)' },
    { value: '3-5 years', label: '3-5 years (Mid Level)' },
    { value: '5-8 years', label: '5-8 years (Senior)' },
    { value: '8-12 years', label: '8-12 years (Lead)' },
    { value: '12+ years', label: '12+ years (Architect / Principal)' },
  ],
  jobTypeOptions: [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Internship', label: 'Internship' },
    { value: 'Remote', label: 'Remote' },
    { value: 'Hybrid', label: 'Hybrid' },
  ],
  fields: [
    {
      name: 'tech_domain',
      label: 'Technology Domain *',
      type: 'select',
      placeholder: 'Select domain',
      required: true,
      helpText: 'Primary technology area for this role',
      options: [
        { value: 'Frontend', label: 'Frontend Development' },
        { value: 'Backend', label: 'Backend Development' },
        { value: 'Full Stack', label: 'Full Stack Development' },
        { value: 'Mobile', label: 'Mobile Development (Android/iOS)' },
        { value: 'DevOps', label: 'DevOps / SRE' },
        { value: 'Cloud', label: 'Cloud Engineering' },
        { value: 'Data Science', label: 'Data Science / Analytics' },
        { value: 'ML/AI', label: 'Machine Learning / AI' },
        { value: 'QA', label: 'QA / Test Automation' },
        { value: 'Security', label: 'Cybersecurity' },
        { value: 'Embedded', label: 'Embedded Systems / IoT' },
        { value: 'Database', label: 'Database / DBA' },
      ],
    },
    {
      name: 'role_level',
      label: 'Role Level',
      type: 'select',
      placeholder: 'Select role level',
      options: [
        { value: 'Intern', label: 'Intern / Trainee' },
        { value: 'Junior', label: 'Junior Engineer' },
        { value: 'Mid', label: 'Software Engineer' },
        { value: 'Senior', label: 'Senior Engineer' },
        { value: 'Lead', label: 'Tech Lead' },
        { value: 'Architect', label: 'Architect' },
        { value: 'Manager', label: 'Engineering Manager' },
        { value: 'Director', label: 'Director of Engineering' },
        { value: 'VP', label: 'VP Engineering' },
        { value: 'CTO', label: 'CTO' },
      ],
    },
    {
      name: 'work_mode',
      label: 'Work Mode',
      type: 'select',
      placeholder: 'Select work mode',
      options: [
        { value: 'On-site', label: 'On-site / Office' },
        { value: 'Remote', label: 'Fully Remote' },
        { value: 'Hybrid', label: 'Hybrid (Office + Remote)' },
        { value: 'Flexible', label: 'Flexible' },
      ],
    },
  ],
};

// ─── Sales ───
const salesConfig: InterviewTypeFormConfig = {
  interviewType: 'sales',
  jobTitlePlaceholder: 'e.g., Regional Sales Manager',
  departmentLabel: 'Department',
  departmentPlaceholder: 'e.g., Sales & Marketing',
  skillsPlaceholder: 'e.g., Negotiation, CRM, Lead Generation, Presentation',
  salaryPlaceholder: 'e.g., ₹5-10 LPA + Incentives',
  experienceOptions: [
    { value: 'Fresher', label: 'Fresher' },
    { value: '0-1 years', label: '0-1 years' },
    { value: '1-3 years', label: '1-3 years' },
    { value: '3-5 years', label: '3-5 years' },
    { value: '5-8 years', label: '5-8 years' },
    { value: '8+ years', label: '8+ years (Senior)' },
  ],
  jobTypeOptions: [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Commission-based', label: 'Commission-based' },
  ],
  fields: [
    {
      name: 'sales_domain',
      label: 'Sales Domain *',
      type: 'select',
      placeholder: 'Select sales domain',
      required: true,
      options: [
        { value: 'B2B', label: 'B2B Sales' },
        { value: 'B2C', label: 'B2C Sales' },
        { value: 'Inside Sales', label: 'Inside Sales' },
        { value: 'Field Sales', label: 'Field Sales' },
        { value: 'Channel Sales', label: 'Channel / Partner Sales' },
        { value: 'Enterprise', label: 'Enterprise Sales' },
        { value: 'Retail', label: 'Retail Sales' },
      ],
    },
    {
      name: 'industry',
      label: 'Industry',
      type: 'select',
      placeholder: 'Select industry',
      options: [
        { value: 'IT/SaaS', label: 'IT / SaaS' },
        { value: 'FMCG', label: 'FMCG' },
        { value: 'Pharma', label: 'Pharmaceuticals' },
        { value: 'Real Estate', label: 'Real Estate' },
        { value: 'Finance', label: 'Banking / Finance' },
        { value: 'Education', label: 'EdTech / Education' },
        { value: 'Manufacturing', label: 'Manufacturing' },
        { value: 'Other', label: 'Other' },
      ],
    },
    {
      name: 'target_type',
      label: 'Target Type',
      type: 'select',
      placeholder: 'Select target type',
      options: [
        { value: 'Revenue', label: 'Revenue Target' },
        { value: 'Volume', label: 'Volume Target' },
        { value: 'Both', label: 'Revenue + Volume' },
        { value: 'None', label: 'No Specific Targets' },
      ],
    },
  ],
};

// ─── Management ───
const managementConfig: InterviewTypeFormConfig = {
  interviewType: 'management',
  jobTitlePlaceholder: 'e.g., Senior Project Manager',
  departmentLabel: 'Department',
  departmentPlaceholder: 'e.g., Project Management',
  skillsPlaceholder: 'e.g., Project Planning, Stakeholder Management, Agile, PMP',
  salaryPlaceholder: 'e.g., ₹15-25 LPA',
  experienceOptions: [
    { value: '1-3 years', label: '1-3 years' },
    { value: '3-5 years', label: '3-5 years' },
    { value: '5-8 years', label: '5-8 years' },
    { value: '8-12 years', label: '8-12 years' },
    { value: '12+ years', label: '12+ years (Director+)' },
  ],
  jobTypeOptions: [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Remote', label: 'Remote' },
    { value: 'Hybrid', label: 'Hybrid' },
  ],
  fields: [
    {
      name: 'management_area',
      label: 'Management Area *',
      type: 'select',
      placeholder: 'Select management area',
      required: true,
      options: [
        { value: 'Project', label: 'Project Management' },
        { value: 'Operations', label: 'Operations Management' },
        { value: 'Product', label: 'Product Management' },
        { value: 'People', label: 'People / HR Management' },
        { value: 'General', label: 'General Management' },
        { value: 'Strategy', label: 'Strategy & Planning' },
      ],
    },
    {
      name: 'team_size',
      label: 'Team Size to Manage',
      type: 'select',
      placeholder: 'Select team size',
      options: [
        { value: '1-5', label: '1-5 members' },
        { value: '5-15', label: '5-15 members' },
        { value: '15-30', label: '15-30 members' },
        { value: '30-50', label: '30-50 members' },
        { value: '50+', label: '50+ members' },
      ],
    },
  ],
};

// ─── Standard ───
const standardConfig: InterviewTypeFormConfig = {
  interviewType: 'standard',
  jobTitlePlaceholder: 'e.g., Office Executive',
  departmentLabel: 'Department',
  departmentPlaceholder: 'e.g., Administration',
  skillsPlaceholder: 'e.g., MS Office, Communication, Data Entry',
  salaryPlaceholder: 'e.g., ₹2-5 LPA',
  experienceOptions: [
    { value: 'Fresher', label: 'Fresher' },
    { value: '0-1 years', label: '0-1 years' },
    { value: '1-3 years', label: '1-3 years' },
    { value: '3-5 years', label: '3-5 years' },
    { value: '5-8 years', label: '5-8 years' },
    { value: '8+ years', label: '8+ years' },
  ],
  jobTypeOptions: [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Internship', label: 'Internship' },
    { value: 'Remote', label: 'Remote' },
  ],
  fields: [
    {
      name: 'job_category',
      label: 'Job Category',
      type: 'select',
      placeholder: 'Select category',
      options: [
        { value: 'Administration', label: 'Administration' },
        { value: 'Accounts', label: 'Accounts / Finance' },
        { value: 'HR', label: 'Human Resources' },
        { value: 'Customer Support', label: 'Customer Support' },
        { value: 'Data Entry', label: 'Data Entry / Back Office' },
        { value: 'Receptionist', label: 'Receptionist / Front Desk' },
        { value: 'Other', label: 'Other' },
      ],
    },
  ],
};

// Map of interview type → config
const configMap: Record<string, InterviewTypeFormConfig> = {
  education: educationConfig,
  it_corporate: itCorporateConfig,
  sales: salesConfig,
  management: managementConfig,
  standard: standardConfig,
};

export const getFormConfigForInterviewType = (interviewType: string): InterviewTypeFormConfig | null => {
  return configMap[interviewType] || null;
};

// Default fallback values when no interview type is selected
export const defaultFormConfig: Pick<InterviewTypeFormConfig, 'jobTitlePlaceholder' | 'departmentLabel' | 'departmentPlaceholder' | 'skillsPlaceholder' | 'salaryPlaceholder' | 'experienceOptions' | 'jobTypeOptions'> = {
  jobTitlePlaceholder: 'e.g., Senior Software Engineer',
  departmentLabel: 'Department',
  departmentPlaceholder: 'e.g., Engineering',
  skillsPlaceholder: 'e.g., React, Node.js, TypeScript',
  salaryPlaceholder: 'e.g., ₹10-15 LPA',
  experienceOptions: [
    { value: '0-1 years', label: '0-1 years (Entry Level)' },
    { value: '1-3 years', label: '1-3 years' },
    { value: '3-5 years', label: '3-5 years' },
    { value: '5-8 years', label: '5-8 years' },
    { value: '8+ years', label: '8+ years (Senior)' },
  ],
  jobTypeOptions: [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Part-time', label: 'Part-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Internship', label: 'Internship' },
    { value: 'Remote', label: 'Remote' },
  ],
};
