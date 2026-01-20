import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  mobile?: string;
  alternate_number?: string;
  registration_number?: string;
  date_of_birth?: string;
  gender?: string;
  current_state?: string;
  current_district?: string;
  highest_qualification?: string;
  office_type?: string;
  segment?: string;
  category?: string;
  experience_level?: string;
  preferred_role?: string;
  primary_subject?: string;
  batch?: string;
  preferred_state?: string;
  preferred_district?: string;
  preferred_state_2?: string;
  preferred_district_2?: string;
  classes_handled?: string;
  languages?: string[];
  resume_url?: string;
}

interface ResumeAnalysis {
  overall_score: number;
  strengths: string[];
  improvements: string[];
  experience_summary: string;
  skill_highlights: string[];
  career_level: string;
}

interface EducationRecord {
  education_level: string;
  school_college_name?: string;
  specialization?: string;
  board_university?: string;
  year_of_passing?: number;
  percentage_marks?: number;
}

interface ExperienceRecord {
  organization: string;
  department: string;
  designation: string;
  from_date?: string;
  to_date?: string;
  salary_per_month?: number;
  place?: string;
}

interface FamilyRecord {
  blood_relation: string;
  name_as_per_aadhar?: string;
  date_of_birth?: string;
  age?: number;
  is_dependent?: boolean;
}

interface AddressData {
  present_door_flat_no?: string;
  present_street?: string;
  present_village_area?: string;
  present_mandal?: string;
  present_district?: string;
  present_state?: string;
  present_pin_code?: string;
  permanent_door_flat_no?: string;
  permanent_street?: string;
  permanent_village_area?: string;
  permanent_mandal?: string;
  permanent_district?: string;
  permanent_state?: string;
  permanent_pin_code?: string;
  same_as_present?: boolean;
}

interface MockTestResult {
  score?: number;
  correct_answers?: number;
  total_questions: number;
  status: string;
  completed_at?: string;
}

interface ProfilePdfExportData {
  profile: Profile;
  resumeAnalysis?: ResumeAnalysis | null;
  educationRecords?: EducationRecord[];
  experienceRecords?: ExperienceRecord[];
  familyRecords?: FamilyRecord[];
  addressData?: AddressData | null;
  mockTestResults?: MockTestResult[];
}

export const useProfilePdfExport = () => {
  const { toast } = useToast();

  const exportProfileToPdf = async (data: ProfilePdfExportData) => {
    const { profile, resumeAnalysis, educationRecords, experienceRecords, familyRecords, addressData, mockTestResults } = data;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 20;
      
      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > 280) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Header
      doc.setFillColor(59, 130, 246); // Blue
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('GRADIA', margin, 18);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Candidate Profile Report', margin, 28);
      
      // Registration number on right
      if (profile.registration_number) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`REG: ${profile.registration_number}`, pageWidth - margin - 50, 18);
      }
      
      // Generated date
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin - 50, 28);
      
      yPos = 45;
      doc.setTextColor(0, 0, 0);

      // Section helper
      const addSection = (title: string, color: [number, number, number] = [59, 130, 246]) => {
        checkPageBreak(15);
        doc.setFillColor(...color);
        doc.rect(margin, yPos, contentWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 3, yPos + 5.5);
        yPos += 12;
        doc.setTextColor(0, 0, 0);
      };

      const addRow = (label: string, value: string, indent = 0) => {
        checkPageBreak(8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(label + ':', margin + indent, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const labelWidth = doc.getTextWidth(label + ': ');
        doc.text(value || '-', margin + indent + labelWidth + 2, yPos);
        yPos += 6;
      };

      // Personal Information
      addSection('PERSONAL INFORMATION');
      addRow('Full Name', profile.full_name);
      addRow('Email', profile.email);
      addRow('Mobile', profile.mobile || '-');
      addRow('Alternate Mobile', profile.alternate_number || '-');
      addRow('Date of Birth', profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN') : '-');
      addRow('Gender', profile.gender || '-');
      addRow('Current State', profile.current_state || '-');
      addRow('Current District', profile.current_district || '-');
      yPos += 4;

      // Professional Information
      addSection('PROFESSIONAL INFORMATION', [34, 197, 94]);
      addRow('Qualification', profile.highest_qualification || '-');
      addRow('Experience Level', profile.experience_level || '-');
      addRow('Preferred Role', profile.preferred_role || '-');
      addRow('Primary Subject', profile.primary_subject || '-');
      addRow('Classes Handled', profile.classes_handled || '-');
      addRow('Office Type', profile.office_type || '-');
      addRow('Segment', profile.segment || '-');
      addRow('Category', profile.category || '-');
      addRow('Batch', profile.batch || '-');
      yPos += 4;

      // Location Preferences
      addSection('LOCATION PREFERENCES', [168, 85, 247]);
      addRow('Preferred State 1', profile.preferred_state || '-');
      addRow('Preferred District 1', profile.preferred_district || '-');
      addRow('Preferred State 2', profile.preferred_state_2 || '-');
      addRow('Preferred District 2', profile.preferred_district_2 || '-');
      yPos += 4;

      // AI Resume Analysis
      if (resumeAnalysis) {
        addSection('AI RESUME ANALYSIS', [249, 115, 22]);
        addRow('Overall Score', `${resumeAnalysis.overall_score}/100`);
        addRow('Career Level', resumeAnalysis.career_level || '-');
        
        if (resumeAnalysis.experience_summary) {
          checkPageBreak(20);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('Experience Summary:', margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          const summaryLines = doc.splitTextToSize(resumeAnalysis.experience_summary, contentWidth - 5);
          doc.text(summaryLines, margin + 3, yPos);
          yPos += summaryLines.length * 4 + 3;
        }

        if (resumeAnalysis.strengths?.length > 0) {
          checkPageBreak(15);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('Strengths:', margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(34, 139, 34);
          resumeAnalysis.strengths.forEach((strength) => {
            checkPageBreak(6);
            doc.text(`• ${strength}`, margin + 3, yPos);
            yPos += 5;
          });
        }

        if (resumeAnalysis.improvements?.length > 0) {
          checkPageBreak(15);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('Areas to Improve:', margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(220, 120, 0);
          resumeAnalysis.improvements.forEach((item) => {
            checkPageBreak(6);
            doc.text(`• ${item}`, margin + 3, yPos);
            yPos += 5;
          });
        }

        if (resumeAnalysis.skill_highlights?.length > 0) {
          checkPageBreak(10);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('Key Skills:', margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(resumeAnalysis.skill_highlights.join(', '), margin + 3, yPos);
          yPos += 6;
        }
        yPos += 4;
      }

      // Education
      if (educationRecords && educationRecords.length > 0) {
        addSection('EDUCATIONAL QUALIFICATIONS', [99, 102, 241]);
        educationRecords.forEach((edu, idx) => {
          checkPageBreak(25);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${idx + 1}. ${edu.education_level}`, margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          if (edu.school_college_name) {
            doc.text(`School/College: ${edu.school_college_name}`, margin + 5, yPos);
            yPos += 4;
          }
          if (edu.specialization) {
            doc.text(`Specialization: ${edu.specialization}`, margin + 5, yPos);
            yPos += 4;
          }
          if (edu.board_university) {
            doc.text(`Board/University: ${edu.board_university}`, margin + 5, yPos);
            yPos += 4;
          }
          const yearMarks = [];
          if (edu.year_of_passing) yearMarks.push(`Year: ${edu.year_of_passing}`);
          if (edu.percentage_marks) yearMarks.push(`Marks: ${edu.percentage_marks}%`);
          if (yearMarks.length > 0) {
            doc.text(yearMarks.join(' | '), margin + 5, yPos);
            yPos += 4;
          }
          yPos += 3;
        });
      }

      // Work Experience
      if (experienceRecords && experienceRecords.length > 0) {
        addSection('WORK EXPERIENCE', [236, 72, 153]);
        experienceRecords.forEach((exp, idx) => {
          checkPageBreak(25);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`${idx + 1}. ${exp.designation} at ${exp.organization}`, margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          if (exp.department) {
            doc.text(`Department: ${exp.department}`, margin + 5, yPos);
            yPos += 4;
          }
          if (exp.from_date || exp.to_date) {
            const from = exp.from_date ? new Date(exp.from_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '';
            const to = exp.to_date ? new Date(exp.to_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Present';
            doc.text(`Duration: ${from} - ${to}`, margin + 5, yPos);
            yPos += 4;
          }
          if (exp.place) {
            doc.text(`Location: ${exp.place}`, margin + 5, yPos);
            yPos += 4;
          }
          yPos += 3;
        });
      }

      // Family Details
      if (familyRecords && familyRecords.length > 0) {
        addSection('FAMILY DETAILS', [20, 184, 166]);
        familyRecords.forEach((fam, idx) => {
          checkPageBreak(15);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`${idx + 1}. ${fam.blood_relation}`, margin, yPos);
          doc.setFont('helvetica', 'normal');
          const details = [];
          if (fam.name_as_per_aadhar) details.push(fam.name_as_per_aadhar);
          if (fam.age) details.push(`Age: ${fam.age}`);
          if (fam.is_dependent) details.push('(Dependent)');
          if (details.length > 0) {
            doc.text(` - ${details.join(', ')}`, margin + doc.getTextWidth(`${idx + 1}. ${fam.blood_relation}`), yPos);
          }
          yPos += 6;
        });
        yPos += 4;
      }

      // Address
      if (addressData) {
        addSection('ADDRESS DETAILS', [107, 114, 128]);
        
        checkPageBreak(25);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Present Address:', margin, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        const presentAddr = [
          addressData.present_door_flat_no,
          addressData.present_street,
          addressData.present_village_area,
          addressData.present_mandal,
          addressData.present_district,
          addressData.present_state,
          addressData.present_pin_code
        ].filter(Boolean).join(', ');
        if (presentAddr) {
          const presentLines = doc.splitTextToSize(presentAddr, contentWidth - 10);
          doc.text(presentLines, margin + 3, yPos);
          yPos += presentLines.length * 4 + 3;
        } else {
          doc.text('Not provided', margin + 3, yPos);
          yPos += 6;
        }

        if (!addressData.same_as_present) {
          doc.setFont('helvetica', 'bold');
          doc.text('Permanent Address:', margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          const permanentAddr = [
            addressData.permanent_door_flat_no,
            addressData.permanent_street,
            addressData.permanent_village_area,
            addressData.permanent_mandal,
            addressData.permanent_district,
            addressData.permanent_state,
            addressData.permanent_pin_code
          ].filter(Boolean).join(', ');
          if (permanentAddr) {
            const permLines = doc.splitTextToSize(permanentAddr, contentWidth - 10);
            doc.text(permLines, margin + 3, yPos);
            yPos += permLines.length * 4 + 3;
          } else {
            doc.text('Not provided', margin + 3, yPos);
            yPos += 6;
          }
        } else {
          doc.text('Permanent Address: Same as Present Address', margin, yPos);
          yPos += 6;
        }
        yPos += 4;
      }

      // Mock Test Results
      if (mockTestResults && mockTestResults.length > 0) {
        const completedTests = mockTestResults.filter(t => t.status === 'completed');
        if (completedTests.length > 0) {
          addSection('MOCK TEST RESULTS', [139, 92, 246]);
          completedTests.forEach((test, idx) => {
            checkPageBreak(15);
            doc.setFontSize(9);
            const scoreText = test.score !== undefined ? `${test.score}%` : '-';
            const correctText = test.correct_answers !== undefined ? `${test.correct_answers}/${test.total_questions}` : '-';
            const dateText = test.completed_at ? new Date(test.completed_at).toLocaleDateString('en-IN') : '-';
            doc.text(`Test ${idx + 1}: Score: ${scoreText} | Correct: ${correctText} | Date: ${dateText}`, margin, yPos);
            yPos += 6;
          });
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
        doc.text('Gradia - Candidate Profile Report', margin, 290);
      }

      // Save
      const fileName = `${profile.full_name.replace(/\s+/g, '_')}_Profile_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: 'PDF Downloaded!',
        description: `Your profile has been saved as ${fileName}`,
      });

    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Could not generate PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return { exportProfileToPdf };
};
