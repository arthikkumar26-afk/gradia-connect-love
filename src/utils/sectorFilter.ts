// Cross-sector job filtering utility.
// Extracted from candidate Dashboard so the rules can be unit-tested.
// Behavior must mirror the inline logic in src/pages/candidate/Dashboard.tsx.

export interface CandidateProfileLike {
  category?: string | null;
  segment?: string | null;
  preferred_role?: string | null;
}

export interface JobLike {
  interview_type?: string | null;
  job_title?: string | null;
  department?: string | null;
  category?: string | null;
  segment?: string | null;
}

const NON_EDUCATION_TYPES = ['it_corporate', 'non_it_corporate', 'legal', 'sales', 'management'];
const NON_IT_TYPES = ['education', 'non_it_corporate', 'legal', 'sales', 'management'];
const NON_LEGAL_TYPES = ['it_corporate', 'education', 'non_it_corporate', 'sales', 'management'];

const EDUCATION_KEYWORDS = [
  'teacher', 'lecturer', 'professor', 'principal', 'tutor', 'educator',
  'academic', 'faculty', 'instructor', 'school', 'college', 'education',
  'teaching', 'classroom', 'curriculum',
];

const IT_KEYWORDS = [
  'software', 'developer', 'engineer', 'programmer', 'devops', 'frontend',
  'backend', 'full stack', 'data scientist', 'data analyst', 'cloud',
  'coding', 'react', 'node', 'python', 'java', 'cyber', 'network',
];

const LEGAL_KEYWORDS = [
  'legal', 'lawyer', 'advocate', 'attorney', 'paralegal',
  'litigation', 'compliance officer', 'law firm',
];

const matchesAnyField = (job: JobLike, keywords: string[]): boolean => {
  const fields = [
    (job.job_title || '').toLowerCase(),
    (job.department || '').toLowerCase(),
    (job.category || '').toLowerCase(),
    (job.segment || '').toLowerCase(),
  ];
  return keywords.some(kw => fields.some(f => f.includes(kw)));
};

export const isEducationJob = (job: JobLike): boolean => {
  const it = (job.interview_type || '').toLowerCase();
  if (it === 'education') return true;
  if (NON_EDUCATION_TYPES.includes(it)) return false;
  return matchesAnyField(job, EDUCATION_KEYWORDS);
};

export const isITJob = (job: JobLike): boolean => {
  const it = (job.interview_type || '').toLowerCase();
  if (it === 'it_corporate') return true;
  if (NON_IT_TYPES.includes(it)) return false;
  return matchesAnyField(job, IT_KEYWORDS);
};

export const isLegalJob = (job: JobLike): boolean => {
  const it = (job.interview_type || '').toLowerCase();
  if (it === 'legal') return true;
  if (NON_LEGAL_TYPES.includes(it)) return false;
  return matchesAnyField(job, LEGAL_KEYWORDS);
};

export const detectCandidateSectors = (profile: CandidateProfileLike | null | undefined) => {
  const profileCategory = (profile?.category || '').toLowerCase();
  const profileSegment = (profile?.segment || '').toLowerCase();
  const profileRole = (profile?.preferred_role || '').toLowerCase();

  const isITCandidate =
    profileCategory.includes('it_corporate') ||
    profileCategory.includes('it corporate') ||
    profileCategory.includes('software') ||
    profileSegment.includes('software') ||
    profileSegment.includes('it') ||
    profileRole.includes('developer') ||
    profileRole.includes('engineer') ||
    profileRole.includes('software') ||
    profileRole.includes('programmer') ||
    profileRole.includes('devops') ||
    profileRole.includes('data scientist') ||
    profileRole.includes('data analyst') ||
    profileRole.includes('full stack') ||
    profileRole.includes('frontend') ||
    profileRole.includes('backend');

  const isEducationCandidate =
    profileCategory.includes('education') ||
    profileCategory.includes('teacher') ||
    profileSegment.includes('education') ||
    profileRole.includes('teacher') ||
    profileRole.includes('lecturer') ||
    profileRole.includes('professor') ||
    profileRole.includes('principal') ||
    profileRole.includes('tutor');

  const isLegalCandidate =
    profileCategory.includes('legal') ||
    profileSegment.includes('legal') ||
    profileRole.includes('lawyer') ||
    profileRole.includes('advocate') ||
    profileRole.includes('attorney') ||
    profileRole.includes('paralegal') ||
    profileRole.includes('legal');

  return { isITCandidate, isEducationCandidate, isLegalCandidate };
};

/**
 * Hard cross-sector filter. Removes jobs from sectors the candidate clearly
 * does not belong to (IT vs Education vs Legal).
 */
export const filterJobsBySector = <T extends JobLike>(
  jobs: T[],
  profile: CandidateProfileLike | null | undefined,
): T[] => {
  const { isITCandidate, isEducationCandidate, isLegalCandidate } = detectCandidateSectors(profile);

  return jobs.filter((job) => {
    if (isITCandidate && !isEducationCandidate && !isLegalCandidate) {
      if (isEducationJob(job) && !isITJob(job)) return false;
      if (isLegalJob(job) && !isITJob(job)) return false;
    }
    if (isEducationCandidate && !isITCandidate && !isLegalCandidate) {
      if (isITJob(job) && !isEducationJob(job)) return false;
      if (isLegalJob(job) && !isEducationJob(job)) return false;
    }
    if (isLegalCandidate && !isITCandidate && !isEducationCandidate) {
      if (isITJob(job) && !isLegalJob(job)) return false;
      if (isEducationJob(job) && !isLegalJob(job)) return false;
    }
    return true;
  });
};
