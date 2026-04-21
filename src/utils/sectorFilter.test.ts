import { describe, it, expect } from "vitest";
import {
  filterJobsBySector,
  isITJob,
  isLegalJob,
  isEducationJob,
  detectCandidateSectors,
} from "./sectorFilter";

const itProfile = {
  category: "it_corporate",
  segment: "Software",
  preferred_role: "Full Stack Developer",
};

const legalProfile = {
  category: "legal",
  segment: "Legal",
  preferred_role: "Lawyer",
};

const educationProfile = {
  category: "education",
  segment: "Education",
  preferred_role: "Teacher",
};

const lawJobs = [
  { id: "1", job_title: "Senior Lawyer", interview_type: "legal" },
  { id: "2", job_title: "Paralegal Associate", category: "Legal" },
  { id: "3", job_title: "Litigation Specialist", department: "Law Firm" },
  { id: "4", job_title: "Compliance Officer", interview_type: "legal" },
];

const itJobs = [
  { id: "10", job_title: "Backend Engineer", interview_type: "it_corporate" },
  { id: "11", job_title: "React Developer", category: "Software" },
  { id: "12", job_title: "DevOps Engineer", department: "Cloud" },
];

const educationJobs = [
  { id: "20", job_title: "Math Teacher", interview_type: "education" },
  { id: "21", job_title: "College Lecturer", category: "Academic" },
  { id: "22", job_title: "School Principal", department: "Faculty" },
];

describe("sector detection helpers", () => {
  it("flags IT candidate from preferred_role", () => {
    expect(detectCandidateSectors(itProfile).isITCandidate).toBe(true);
    expect(detectCandidateSectors(itProfile).isLegalCandidate).toBe(false);
    expect(detectCandidateSectors(itProfile).isEducationCandidate).toBe(false);
  });

  it("flags Legal candidate from category", () => {
    const r = detectCandidateSectors(legalProfile);
    expect(r.isLegalCandidate).toBe(true);
    expect(r.isITCandidate).toBe(false);
  });

  it("classifies law-related jobs as legal jobs", () => {
    for (const j of lawJobs) expect(isLegalJob(j)).toBe(true);
  });

  it("classifies IT jobs correctly", () => {
    for (const j of itJobs) expect(isITJob(j)).toBe(true);
  });

  it("classifies education jobs correctly", () => {
    for (const j of educationJobs) expect(isEducationJob(j)).toBe(true);
  });
});

describe("filterJobsBySector — IT candidate", () => {
  it("removes ALL law/legal jobs for an IT candidate", () => {
    const mixed = [...itJobs, ...lawJobs];
    const filtered = filterJobsBySector(mixed, itProfile);
    expect(filtered.some((j) => isLegalJob(j))).toBe(false);
    expect(filtered.length).toBe(itJobs.length);
  });

  it("removes education jobs for an IT candidate", () => {
    const mixed = [...itJobs, ...educationJobs];
    const filtered = filterJobsBySector(mixed, itProfile);
    expect(filtered.some((j) => isEducationJob(j) && !isITJob(j))).toBe(false);
  });

  it("never recommends a Lawyer position to an IT candidate (regression)", () => {
    const lawyerJob = { id: "x", job_title: "Lawyer", interview_type: "legal" };
    const result = filterJobsBySector([lawyerJob], itProfile);
    expect(result).toEqual([]);
  });
});

describe("filterJobsBySector — Legal candidate", () => {
  it("removes IT jobs for a Legal candidate", () => {
    const mixed = [...itJobs, ...lawJobs];
    const filtered = filterJobsBySector(mixed, legalProfile);
    expect(filtered.some((j) => isITJob(j) && !isLegalJob(j))).toBe(false);
    expect(filtered.length).toBe(lawJobs.length);
  });

  it("removes education jobs for a Legal candidate", () => {
    const mixed = [...lawJobs, ...educationJobs];
    const filtered = filterJobsBySector(mixed, legalProfile);
    expect(filtered.some((j) => isEducationJob(j) && !isLegalJob(j))).toBe(false);
  });

  it("never recommends a Software Engineer to a Lawyer (reverse regression)", () => {
    const itJob = { id: "y", job_title: "Software Engineer", interview_type: "it_corporate" };
    expect(filterJobsBySector([itJob], legalProfile)).toEqual([]);
  });
});

describe("filterJobsBySector — Education candidate", () => {
  it("removes IT and Legal jobs for an Education candidate", () => {
    const mixed = [...itJobs, ...lawJobs, ...educationJobs];
    const filtered = filterJobsBySector(mixed, educationProfile);
    expect(filtered.some((j) => isITJob(j) && !isEducationJob(j))).toBe(false);
    expect(filtered.some((j) => isLegalJob(j) && !isEducationJob(j))).toBe(false);
    expect(filtered.length).toBe(educationJobs.length);
  });
});

describe("filterJobsBySector — neutral profile", () => {
  it("does not filter when candidate sector cannot be determined", () => {
    const mixed = [...itJobs, ...lawJobs, ...educationJobs];
    const filtered = filterJobsBySector(mixed, { category: "", segment: "", preferred_role: "" });
    expect(filtered.length).toBe(mixed.length);
  });
});
