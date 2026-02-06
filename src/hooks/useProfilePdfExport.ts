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
  profile_picture?: string;
  current_salary?: number;
  expected_salary?: number;
  available_from?: string;
  program?: string;
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

interface MockInterviewStageResult {
  id: string;
  session_id: string;
  stage_name: string;
  stage_order: number;
  ai_score?: number;
  ai_feedback?: string;
  passed?: boolean;
  strengths?: string[];
  improvements?: string[];
  questions?: any[];
  answers?: any[];
  question_scores?: any[];
  completed_at?: string;
  time_taken_seconds?: number;
}

interface MockInterviewSession {
  id: string;
  status: string;
  overall_score?: number;
  overall_feedback?: string;
  completed_at?: string;
  started_at?: string;
}

interface ProfilePdfExportData {
  profile: Profile;
  resumeAnalysis?: ResumeAnalysis | null;
  educationRecords?: EducationRecord[];
  experienceRecords?: ExperienceRecord[];
  familyRecords?: FamilyRecord[];
  addressData?: AddressData | null;
  mockTestResults?: MockTestResult[];
  mockInterviewSessions?: MockInterviewSession[];
  mockInterviewStageResults?: MockInterviewStageResult[];
}

export const useProfilePdfExport = () => {
  const { toast } = useToast();

  const exportProfileToPdf = async (data: ProfilePdfExportData) => {
    const { profile, resumeAnalysis, educationRecords, experienceRecords, familyRecords, addressData, mockTestResults, mockInterviewSessions, mockInterviewStageResults } = data;
    
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

      // Helper to load image as base64
      const loadImageAsBase64 = async (url: string): Promise<string | null> => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      // Helper to create circular image using canvas
      const createCircularImage = async (imageUrl: string, size: number): Promise<string | null> => {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const imageBitmap = await createImageBitmap(blob);
          
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          
          // Draw white circle background
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Clip to circle and draw image
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          
          // Draw image centered and cover the circle
          const scale = Math.max(size / imageBitmap.width, size / imageBitmap.height);
          const scaledWidth = imageBitmap.width * scale;
          const scaledHeight = imageBitmap.height * scale;
          const offsetX = (size - scaledWidth) / 2;
          const offsetY = (size - scaledHeight) / 2;
          
          ctx.drawImage(imageBitmap, offsetX, offsetY, scaledWidth, scaledHeight);
          
          return canvas.toDataURL('image/png');
        } catch (e) {
          console.error('Failed to create circular image:', e);
          return null;
        }
      };

      // Header - taller to accommodate larger profile picture
      doc.setFillColor(59, 130, 246); // Blue
      doc.rect(0, 0, pageWidth, 55, 'F');
      
      // Add profile picture if available
      let profileImageLoaded = false;
      const imgSize = 32; // Size in PDF mm
      const canvasSize = 200; // Higher resolution for canvas
      const imgX = margin + 3;
      const imgY = 12;
      
      if (profile.profile_picture) {
        try {
          const circularImgData = await createCircularImage(profile.profile_picture, canvasSize);
          if (circularImgData) {
            // Add the circular image directly - it already has white border
            doc.addImage(circularImgData, 'PNG', imgX, imgY, imgSize, imgSize);
            profileImageLoaded = true;
          }
        } catch (e) {
          console.error('Failed to load profile image:', e);
        }
      }
      
      const textOffset = profileImageLoaded ? imgSize + 15 : 0;
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('GRADIA', margin + textOffset, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Candidate Profile Report', margin + textOffset, 30);
      
      // Candidate name in header
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(profile.full_name, margin + textOffset, 42);
      
      // Registration number on right
      if (profile.registration_number) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`REG: ${profile.registration_number}`, pageWidth - margin - 50, 20);
      }
      
      // Generated date
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - margin - 50, 30);
      
      yPos = 58;
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

      // Table-style helper - creates a professional 4-column table layout
      const rowHeight = 8;
      const col1Width = 55; // Label 1 width
      const col2Width = 50; // Value 1 width
      const col3Width = 55; // Label 2 width
      const col4Width = contentWidth - col1Width - col2Width - col3Width; // Value 2 width
      
      const addTableHeader = (title: string, color: [number, number, number] = [0, 128, 128]) => {
        checkPageBreak(15);
        // Draw header background
        doc.setFillColor(245, 250, 250); // Light teal background
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        // Draw left accent
        doc.setFillColor(...color);
        doc.rect(margin, yPos, 4, 10, 'F');
        // Add title text
        doc.setTextColor(...color);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 8, yPos + 7);
        yPos += 12;
        doc.setTextColor(0, 0, 0);
      };

      const addTableRow = (
        label1: string, value1: string, 
        label2?: string, value2?: string,
        isAlternate: boolean = false
      ) => {
        checkPageBreak(rowHeight + 2);
        
        // Alternate row background
        if (isAlternate) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, yPos - 1, contentWidth, rowHeight, 'F');
        }
        
        // Draw subtle grid lines
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(margin, yPos + rowHeight - 1, margin + contentWidth, yPos + rowHeight - 1);
        
        // Column 1 - Label 1 (teal color)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 128, 128);
        doc.text(label1.toUpperCase(), margin + 3, yPos + 5);
        
        // Column 2 - Value 1
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        const val1 = value1 || '-';
        const truncatedVal1 = val1.length > 25 ? val1.substring(0, 22) + '...' : val1;
        doc.text(truncatedVal1, margin + col1Width + 3, yPos + 5);
        
        // Column 3 - Label 2 (if provided)
        if (label2 !== undefined) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 128, 128);
          doc.text(label2.toUpperCase(), margin + col1Width + col2Width + 3, yPos + 5);
          
          // Column 4 - Value 2
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          const val2 = value2 || '-';
          const truncatedVal2 = val2.length > 25 ? val2.substring(0, 22) + '...' : val2;
          doc.text(truncatedVal2, margin + col1Width + col2Width + col3Width + 3, yPos + 5);
        }
        
        yPos += rowHeight;
      };

      // Registration Number Header Row
      checkPageBreak(15);
      doc.setFillColor(245, 250, 250);
      doc.rect(margin, yPos, contentWidth, 10, 'F');
      doc.setFillColor(0, 128, 128);
      doc.rect(margin, yPos, 4, 10, 'F');
      doc.setTextColor(0, 128, 128);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('REG. NUMBER', margin + 8, yPos + 7);
      doc.setTextColor(0, 100, 100);
      doc.setFontSize(11);
      doc.text(profile.registration_number || 'N/A', margin + 55, yPos + 7);
      yPos += 14;

      // Personal & Professional Information Table
      addTableRow('NAME', profile.full_name, 'Date', new Date().toLocaleDateString('en-IN'), false);
      addTableRow('CURRENT STATE', profile.current_state || '-', 'CURRENT DISTRICT', profile.current_district || '-', true);
      addTableRow('DOB', profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN') : '-', 'GENDER', profile.gender || '-', false);
      addTableRow('QUALIFICATION', profile.highest_qualification || '-', 'OFFICE TYPE', profile.office_type || '-', true);
      addTableRow('SEGMENT', profile.segment || '-', 'CATEGORY', profile.category || '-', false);
      addTableRow('CURRENT SALARY', profile.current_salary ? `₹${profile.current_salary}` : '-', 'EXPECTED SALARY', profile.expected_salary ? `₹${profile.expected_salary}` : '-', true);
      addTableRow('AVAILABLE FROM', profile.available_from ? new Date(profile.available_from).toLocaleDateString('en-IN') : '-', 'PROGRAM', profile.program || 'Full Time', false);
      addTableRow('CLASSES HANDLED', profile.classes_handled || '-', 'LANGUAGES KNOWN', profile.languages?.join(', ') || '-', true);
      addTableRow('PRIMARY SUBJECT', profile.primary_subject || '-', 'BATCH', profile.batch || '-', false);
      addTableRow('EMAIL', profile.email, 'MOBILE', profile.mobile || '-', true);
      addTableRow('PREFERRED ROLE', profile.preferred_role || '-', 'EXPERIENCE', profile.experience_level || '-', false);
      yPos += 6;
      
      // Location Preferences Table
      addTableHeader('LOCATION PREFERENCES', [168, 85, 247]);
      addTableRow('PREFERRED STATE 1', profile.preferred_state || '-', 'PREFERRED DISTRICT 1', profile.preferred_district || '-', false);
      addTableRow('PREFERRED STATE 2', profile.preferred_state_2 || '-', 'PREFERRED DISTRICT 2', profile.preferred_district_2 || '-', true);
      yPos += 6;

      // AI Resume Analysis
      if (resumeAnalysis) {
        addSection('AI RESUME ANALYSIS', [249, 115, 22]);
        
        // Score and Career Level with visual indicator
        checkPageBreak(20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Overall Score:', margin, yPos);
        
        // Score badge
        const score = resumeAnalysis.overall_score || 0;
        const scoreColor: [number, number, number] = score >= 70 ? [34, 139, 34] : score >= 50 ? [255, 165, 0] : [220, 53, 69];
        doc.setFillColor(...scoreColor);
        doc.roundedRect(margin + 35, yPos - 4, 25, 7, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(`${score}/100`, margin + 37, yPos);
        yPos += 8;
        
        doc.setTextColor(0, 0, 0);
        addRow('Career Level', resumeAnalysis.career_level || '-');
        yPos += 4;
        
        // Score Explanation - Why this score? (DETAILED)
        const strengthsCount = resumeAnalysis.strengths?.length || 0;
        const improvementsCount = resumeAnalysis.improvements?.length || 0;
        const skillsCount = resumeAnalysis.skill_highlights?.length || 0;
        const hasExperience = resumeAnalysis.experience_summary && resumeAnalysis.experience_summary.length > 20;
        const hasEducation = educationRecords && educationRecords.length > 0;
        const hasWorkExp = experienceRecords && experienceRecords.length > 0;
        const hasAddress = addressData && (addressData.present_state || addressData.permanent_state);
        const hasFamily = familyRecords && familyRecords.length > 0;
        
        // Calculate component scores
        const profileScore = (profile.full_name ? 10 : 0) + (profile.email ? 10 : 0) + (profile.mobile ? 10 : 0) + 
                            (profile.date_of_birth ? 5 : 0) + (profile.gender ? 5 : 0) + (profile.highest_qualification ? 10 : 0);
        const skillsScore = Math.min(skillsCount * 5, 25);
        const experienceScore = hasWorkExp ? (experienceRecords.length >= 2 ? 20 : 10) : 0;
        const educationScore = hasEducation ? (educationRecords.length >= 2 ? 15 : 8) : 0;
        const strengthsScore = Math.min(strengthsCount * 3, 15);
        
        // Calculate height needed for explanation box
        const explanationBoxHeight = 85;
        checkPageBreak(explanationBoxHeight + 10);
        
        doc.setFillColor(254, 243, 199); // Light yellow background
        doc.roundedRect(margin, yPos, contentWidth, explanationBoxHeight, 2, 2, 'F');
        doc.setDrawColor(245, 158, 11); // Orange border
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos, contentWidth, explanationBoxHeight, 2, 2, 'S');
        
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9);
        doc.text('DETAILED SCORE ANALYSIS - Why This Score?', margin + 3, yPos);
        yPos += 7;
        
        // Score breakdown header
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 50, 10);
        doc.text('SCORE BREAKDOWN:', margin + 3, yPos);
        yPos += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 70, 20);
        
        // Component breakdown with points
        const components = [
          { name: 'Personal Information', earned: profileScore, max: 50, detail: `Name, Email, Mobile, DOB, Gender, Qualification` },
          { name: 'Skills & Competencies', earned: skillsScore, max: 25, detail: `${skillsCount} skills identified` },
          { name: 'Work Experience', earned: experienceScore, max: 20, detail: hasWorkExp ? `${experienceRecords.length} experience(s) documented` : 'No experience added' },
          { name: 'Educational Background', earned: educationScore, max: 15, detail: hasEducation ? `${educationRecords.length} qualification(s) listed` : 'No education added' },
          { name: 'Profile Strengths', earned: strengthsScore, max: 15, detail: `${strengthsCount} strengths found by AI` },
        ];
        
        components.forEach(comp => {
          const percentage = comp.max > 0 ? Math.round((comp.earned / comp.max) * 100) : 0;
          const status = percentage >= 70 ? 'Good' : percentage >= 40 ? 'Fair' : 'Needs Work';
          doc.text(`  - ${comp.name}: ${comp.earned}/${comp.max} pts (${percentage}% - ${status}) | ${comp.detail}`, margin + 3, yPos);
          yPos += 4;
        });
        
        yPos += 3;
        
        // Detailed explanation
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('ANALYSIS SUMMARY:', margin + 3, yPos);
        yPos += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        
        let detailedExplanation = '';
        if (score >= 80) {
          detailedExplanation = `EXCELLENT PROFILE: Your CV scored ${score}/100 because it demonstrates comprehensive coverage across all key areas. ` +
            `You have ${strengthsCount} identified strengths, ${skillsCount} relevant skills, and ${hasExperience ? 'detailed' : 'documented'} experience. ` +
            `Your profile shows clear career direction, well-articulated qualifications, and professional presentation. ` +
            `AI analysis found strong alignment with industry standards and potential for high employability.`;
        } else if (score >= 60) {
          detailedExplanation = `GOOD PROFILE WITH GAPS: Your CV scored ${score}/100 indicating solid foundation but missing elements. ` +
            `Positive: ${strengthsCount} strengths and ${skillsCount} skills identified. ` +
            `Areas needing attention: ${improvementsCount} improvement points found. ` +
            `${!hasWorkExp ? 'Missing work experience details. ' : ''}${!hasEducation ? 'Education section incomplete. ' : ''}` +
            `${skillsCount < 5 ? 'Add more technical/soft skills. ' : ''}Enhance with quantifiable achievements for better scoring.`;
        } else if (score >= 40) {
          detailedExplanation = `AVERAGE PROFILE - NEEDS WORK: Your CV scored ${score}/100 due to significant gaps. ` +
            `Only ${strengthsCount} strengths found vs ${improvementsCount} improvement areas. ` +
            `Critical missing elements: ${!hasWorkExp ? 'Work Experience, ' : ''}${!hasEducation ? 'Education Details, ' : ''}` +
            `${skillsCount < 3 ? 'Skills (only ' + skillsCount + ' found), ' : ''}${!hasAddress ? 'Address Information, ' : ''}. ` +
            `Recommendation: Complete all profile sections, add detailed job descriptions, and include measurable accomplishments.`;
        } else {
          detailedExplanation = `INCOMPLETE PROFILE - MAJOR IMPROVEMENTS NEEDED: Your CV scored only ${score}/100 indicating critical deficiencies. ` +
            `Issues found: ${improvementsCount} major problems, only ${strengthsCount} strengths. ` +
            `Missing sections: ${!hasWorkExp ? 'Work History, ' : ''}${!hasEducation ? 'Education, ' : ''}${skillsCount < 2 ? 'Skills, ' : ''}` +
            `${!hasAddress ? 'Address, ' : ''}${!profile.resume_url ? 'Resume Upload, ' : ''}. ` +
            `Action Required: Complete profile from scratch with all mandatory fields, upload professional resume, and add detailed career information.`;
        }
        
        const explanationLines = doc.splitTextToSize(detailedExplanation, contentWidth - 8);
        doc.text(explanationLines, margin + 3, yPos);
        yPos += Math.min(explanationLines.length * 3, 25) + 10;
        
        // Experience Summary with better formatting
        if (resumeAnalysis.experience_summary) {
          checkPageBreak(25);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('Experience Summary:', margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          const summaryLines = doc.splitTextToSize(resumeAnalysis.experience_summary, contentWidth - 5);
          doc.text(summaryLines, margin + 3, yPos);
          yPos += summaryLines.length * 4 + 5;
        }

        // Key Skills
        if (resumeAnalysis.skill_highlights?.length > 0) {
          checkPageBreak(15);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('Key Skills:', margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(59, 130, 246);
          const skillsText = resumeAnalysis.skill_highlights.join(' • ');
          const skillLines = doc.splitTextToSize(skillsText, contentWidth - 5);
          doc.text(skillLines, margin + 3, yPos);
          yPos += skillLines.length * 4 + 5;
        }

        // STRENGTHS (Positives) - Show FIRST
        if (resumeAnalysis.strengths?.length > 0) {
          checkPageBreak(20);
          doc.setFillColor(34, 197, 94);
          doc.roundedRect(margin, yPos, contentWidth, 7, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('✓ STRENGTHS (Positives)', margin + 3, yPos + 5);
          yPos += 10;
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(34, 139, 34);
          resumeAnalysis.strengths.forEach((strength) => {
            checkPageBreak(8);
            const strengthLines = doc.splitTextToSize(`• ${strength}`, contentWidth - 10);
            doc.text(strengthLines, margin + 3, yPos);
            yPos += strengthLines.length * 4 + 2;
          });
          yPos += 4;
        }

        // IMPROVEMENTS (Negatives) - Show SECOND
        if (resumeAnalysis.improvements?.length > 0) {
          checkPageBreak(20);
          doc.setFillColor(239, 68, 68);
          doc.roundedRect(margin, yPos, contentWidth, 7, 1, 1, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('✗ AREAS FOR IMPROVEMENT (Negatives)', margin + 3, yPos + 5);
          yPos += 10;
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(180, 80, 0);
          resumeAnalysis.improvements.forEach((item) => {
            checkPageBreak(8);
            const improvementLines = doc.splitTextToSize(`• ${item}`, contentWidth - 10);
            doc.text(improvementLines, margin + 3, yPos);
            yPos += improvementLines.length * 4 + 2;
          });
          yPos += 4;
        }
        
        yPos += 4;
      }

      // Education - Table Style
      if (educationRecords && educationRecords.length > 0) {
        addTableHeader('EDUCATIONAL QUALIFICATIONS', [99, 102, 241]);
        educationRecords.forEach((edu, idx) => {
          checkPageBreak(35);
          // Education level header row
          doc.setFillColor(240, 245, 255);
          doc.rect(margin, yPos - 1, contentWidth, 7, 'F');
          doc.setDrawColor(99, 102, 241);
          doc.setLineWidth(0.3);
          doc.line(margin, yPos + 6, margin + contentWidth, yPos + 6);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(99, 102, 241);
          doc.text(`${idx + 1}. ${edu.education_level}`, margin + 3, yPos + 4);
          yPos += 9;
          
          // Education details in table rows
          addTableRow('SCHOOL/COLLEGE', edu.school_college_name || '-', 'SPECIALIZATION', edu.specialization || '-', idx % 2 === 0);
          addTableRow('BOARD/UNIVERSITY', edu.board_university || '-', 'YEAR OF PASSING', edu.year_of_passing?.toString() || '-', idx % 2 !== 0);
          addTableRow('PERCENTAGE/MARKS', edu.percentage_marks ? `${edu.percentage_marks}%` : '-', '', '', idx % 2 === 0);
          yPos += 4;
        });
        yPos += 4;
      }

      // Work Experience - Table Style
      if (experienceRecords && experienceRecords.length > 0) {
        addTableHeader('WORK EXPERIENCE', [236, 72, 153]);
        experienceRecords.forEach((exp, idx) => {
          checkPageBreak(35);
          // Organization header row
          doc.setFillColor(255, 240, 245);
          doc.rect(margin, yPos - 1, contentWidth, 7, 'F');
          doc.setDrawColor(236, 72, 153);
          doc.setLineWidth(0.3);
          doc.line(margin, yPos + 6, margin + contentWidth, yPos + 6);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(236, 72, 153);
          doc.text(`${idx + 1}. ${exp.designation || 'Position'} at ${exp.organization}`, margin + 3, yPos + 4);
          yPos += 9;
          
          // Experience details in table rows
          addTableRow('DEPARTMENT', exp.department || '-', 'LOCATION', exp.place || '-', idx % 2 === 0);
          const fromDate = exp.from_date ? new Date(exp.from_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-';
          const toDate = exp.to_date ? new Date(exp.to_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Present';
          addTableRow('FROM DATE', fromDate, 'TO DATE', toDate, idx % 2 !== 0);
          addTableRow('SALARY (₹/MONTH)', exp.salary_per_month ? `₹${exp.salary_per_month.toLocaleString()}` : '-', '', '', idx % 2 === 0);
          yPos += 4;
        });
        yPos += 4;
      }

      // Family Details - Table Style
      if (familyRecords && familyRecords.length > 0) {
        addTableHeader('FAMILY DETAILS', [20, 184, 166]);
        familyRecords.forEach((fam, idx) => {
          checkPageBreak(12);
          const dobFormatted = fam.date_of_birth ? new Date(fam.date_of_birth).toLocaleDateString('en-IN') : '-';
          const dependentStatus = fam.is_dependent ? 'Yes' : 'No';
          addTableRow('RELATION', fam.blood_relation, 'NAME', fam.name_as_per_aadhar || '-', idx % 2 === 0);
          addTableRow('DATE OF BIRTH', dobFormatted, 'AGE', fam.age?.toString() || '-', idx % 2 !== 0);
          addTableRow('IS DEPENDENT', dependentStatus, '', '', idx % 2 === 0);
          yPos += 2;
        });
        yPos += 4;
      }

      // Address - Table Style
      if (addressData) {
        addTableHeader('ADDRESS DETAILS', [107, 114, 128]);
        
        checkPageBreak(30);
        // Present Address sub-header
        doc.setFillColor(245, 247, 250);
        doc.rect(margin, yPos - 1, contentWidth, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(107, 114, 128);
        doc.text('PRESENT ADDRESS', margin + 3, yPos + 4);
        yPos += 9;
        
        addTableRow('DOOR/FLAT NO', addressData.present_door_flat_no || '-', 'STREET', addressData.present_street || '-', false);
        addTableRow('VILLAGE/AREA', addressData.present_village_area || '-', 'MANDAL', addressData.present_mandal || '-', true);
        addTableRow('DISTRICT', addressData.present_district || '-', 'STATE', addressData.present_state || '-', false);
        addTableRow('PIN CODE', addressData.present_pin_code || '-', '', '', true);
        yPos += 4;

        if (!addressData.same_as_present) {
          checkPageBreak(30);
          // Permanent Address sub-header
          doc.setFillColor(245, 247, 250);
          doc.rect(margin, yPos - 1, contentWidth, 7, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(107, 114, 128);
          doc.text('PERMANENT ADDRESS', margin + 3, yPos + 4);
          yPos += 9;
          
          addTableRow('DOOR/FLAT NO', addressData.permanent_door_flat_no || '-', 'STREET', addressData.permanent_street || '-', false);
          addTableRow('VILLAGE/AREA', addressData.permanent_village_area || '-', 'MANDAL', addressData.permanent_mandal || '-', true);
          addTableRow('DISTRICT', addressData.permanent_district || '-', 'STATE', addressData.permanent_state || '-', false);
          addTableRow('PIN CODE', addressData.permanent_pin_code || '-', '', '', true);
        } else {
          addTableRow('PERMANENT ADDRESS', 'Same as Present Address', '', '', false);
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

      // Mock Interview Pipeline Results - Detailed for Skillory AI
      if (mockInterviewSessions && mockInterviewSessions.length > 0 && mockInterviewStageResults && mockInterviewStageResults.length > 0) {
        const completedSessions = mockInterviewSessions.filter(s => s.status === 'completed');
        
        if (completedSessions.length > 0) {
          addSection('MOCK INTERVIEW PIPELINE RESULTS', [79, 70, 229]);
          
          completedSessions.forEach((session, sessionIdx) => {
            checkPageBreak(20);
            
            // Session header
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(79, 70, 229);
            const sessionDate = session.completed_at ? new Date(session.completed_at).toLocaleDateString('en-IN') : 'N/A';
            doc.text(`Session ${sessionIdx + 1} - Completed: ${sessionDate}`, margin, yPos);
            yPos += 6;
            
            // Overall session score
            if (session.overall_score !== undefined) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0, 0, 0);
              doc.text(`Overall Score: ${session.overall_score}%`, margin + 5, yPos);
              yPos += 5;
            }
            
            if (session.overall_feedback) {
              const feedbackLines = doc.splitTextToSize(`Feedback: ${session.overall_feedback}`, contentWidth - 15);
              doc.text(feedbackLines, margin + 5, yPos);
              yPos += feedbackLines.length * 4 + 3;
            }
            
            // Stage results for this session
            const sessionStages = mockInterviewStageResults
              .filter(sr => sr.session_id === session.id)
              .sort((a, b) => a.stage_order - b.stage_order);
            
            sessionStages.forEach((stage) => {
              checkPageBreak(40);
              
              // Stage header with pass/fail indicator
              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              const stageColor: [number, number, number] = stage.passed ? [34, 139, 34] : [220, 53, 69];
              doc.setTextColor(...stageColor);
              doc.text(`${stage.passed ? '✓' : '✗'} Stage ${stage.stage_order}: ${stage.stage_name}`, margin + 5, yPos);
              yPos += 5;
              
              doc.setTextColor(0, 0, 0);
              doc.setFont('helvetica', 'normal');
              
              // Stage score and time
              const stageScore = stage.ai_score !== undefined ? `${stage.ai_score}%` : '-';
              const stageTime = stage.time_taken_seconds ? `${Math.floor(stage.time_taken_seconds / 60)}m ${stage.time_taken_seconds % 60}s` : '-';
              doc.text(`Score: ${stageScore} | Time: ${stageTime} | Status: ${stage.passed ? 'PASSED' : 'FAILED'}`, margin + 10, yPos);
              yPos += 5;
              
              // AI Feedback for this stage
              if (stage.ai_feedback) {
                doc.setFontSize(8);
                doc.setTextColor(80, 80, 80);
                const feedbackLines = doc.splitTextToSize(`AI Feedback: ${stage.ai_feedback}`, contentWidth - 20);
                doc.text(feedbackLines, margin + 10, yPos);
                yPos += feedbackLines.length * 3.5 + 2;
              }
              
              // Stage strengths
              if (stage.strengths && stage.strengths.length > 0) {
                doc.setFontSize(8);
                doc.setTextColor(34, 139, 34);
                doc.text('Strengths:', margin + 10, yPos);
                yPos += 4;
                stage.strengths.forEach(s => {
                  checkPageBreak(6);
                  const sLines = doc.splitTextToSize(`• ${s}`, contentWidth - 25);
                  doc.text(sLines, margin + 15, yPos);
                  yPos += sLines.length * 3.5;
                });
                yPos += 2;
              }
              
              // Stage improvements
              if (stage.improvements && stage.improvements.length > 0) {
                doc.setFontSize(8);
                doc.setTextColor(180, 80, 0);
                doc.text('Areas to Improve:', margin + 10, yPos);
                yPos += 4;
                stage.improvements.forEach(imp => {
                  checkPageBreak(6);
                  const impLines = doc.splitTextToSize(`• ${imp}`, contentWidth - 25);
                  doc.text(impLines, margin + 15, yPos);
                  yPos += impLines.length * 3.5;
                });
                yPos += 2;
              }
              
              yPos += 4;
            });
            
            yPos += 6;
          });
        }
      }

      // CV SCORE BREAKDOWN - Detailed for Skillory AI Compatibility
      if (resumeAnalysis) {
        checkPageBreak(60);
        addSection('CV SCORE BREAKDOWN (Skillory AI Compatible)', [220, 38, 127]);
        
        const score = resumeAnalysis.overall_score || 0;
        
        // Score explanation header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Your CV Score: ${score}/100`, margin, yPos);
        yPos += 8;
        
        // Score breakdown explanation
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        
        // Why this score
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text('WHY THIS SCORE?', margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        
        const scoreExplanation = score >= 80 
          ? 'Your CV demonstrates excellent completeness with strong professional details, comprehensive experience documentation, and well-articulated skills.'
          : score >= 60 
            ? 'Your CV shows good foundational content but lacks some key details that could strengthen your profile. Focus on adding quantifiable achievements and detailed project descriptions.'
            : score >= 40
              ? 'Your CV needs significant improvement. Missing critical sections like detailed work experience, quantifiable achievements, and comprehensive skill sets.'
              : 'Your CV requires substantial work. Most essential sections are either incomplete or missing entirely.';
        
        const explanationLines = doc.splitTextToSize(scoreExplanation, contentWidth - 5);
        doc.text(explanationLines, margin + 3, yPos);
        yPos += explanationLines.length * 4 + 6;
        
        // What you have (strengths)
        if (resumeAnalysis.strengths && resumeAnalysis.strengths.length > 0) {
          checkPageBreak(25);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(34, 139, 34);
          doc.text('✓ WHAT YOU HAVE (Contributing to your score):', margin, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          resumeAnalysis.strengths.forEach(strength => {
            checkPageBreak(8);
            const sLines = doc.splitTextToSize(`• ${strength}`, contentWidth - 10);
            doc.text(sLines, margin + 5, yPos);
            yPos += sLines.length * 4;
          });
          yPos += 4;
        }
        
        // What's missing (improvements)
        if (resumeAnalysis.improvements && resumeAnalysis.improvements.length > 0) {
          checkPageBreak(25);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 53, 69);
          doc.text('✗ WHAT\'S MISSING (Areas reducing your score):', margin, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(180, 80, 0);
          resumeAnalysis.improvements.forEach(improvement => {
            checkPageBreak(8);
            const iLines = doc.splitTextToSize(`• ${improvement}`, contentWidth - 10);
            doc.text(iLines, margin + 5, yPos);
            yPos += iLines.length * 4;
          });
          yPos += 4;
        }
        
        // Actionable recommendations
        checkPageBreak(40);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text('📋 ACTION ITEMS TO IMPROVE YOUR CV:', margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        
        const recommendations = [
          'Add quantifiable achievements (e.g., "Increased student engagement by 25%")',
          'Include specific project descriptions with outcomes',
          'List certifications, awards, and professional development courses',
          'Add detailed technical skills with proficiency levels',
          'Include keywords relevant to your target role for ATS optimization',
          'Ensure contact information and professional summary are complete',
          'Add references or testimonials if available'
        ];
        
        recommendations.forEach(rec => {
          checkPageBreak(8);
          const recLines = doc.splitTextToSize(`→ ${rec}`, contentWidth - 10);
          doc.text(recLines, margin + 5, yPos);
          yPos += recLines.length * 4;
        });
        yPos += 6;
        
        // Profile completeness checklist
        checkPageBreak(50);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(168, 85, 247);
        doc.text('📊 PROFILE COMPLETENESS CHECKLIST:', margin, yPos);
        yPos += 6;
        
        const checklistItems = [
          { item: 'Personal Information', hasData: !!(profile.full_name && profile.email && profile.mobile) },
          { item: 'Educational Qualifications', hasData: educationRecords && educationRecords.length > 0 },
          { item: 'Work Experience', hasData: experienceRecords && experienceRecords.length > 0 },
          { item: 'Professional Summary', hasData: !!resumeAnalysis.experience_summary },
          { item: 'Skills & Competencies', hasData: resumeAnalysis.skill_highlights && resumeAnalysis.skill_highlights.length > 0 },
          { item: 'Location Preferences', hasData: !!(profile.preferred_state && profile.preferred_district) },
          { item: 'Resume Uploaded', hasData: !!profile.resume_url },
          { item: 'Profile Picture', hasData: !!profile.profile_picture },
          { item: 'Address Details', hasData: !!addressData },
          { item: 'Family Details', hasData: familyRecords && familyRecords.length > 0 },
        ];
        
        doc.setFontSize(8);
        checklistItems.forEach(check => {
          checkPageBreak(6);
          doc.setTextColor(check.hasData ? 34 : 180, check.hasData ? 139 : 80, check.hasData ? 34 : 0);
          doc.text(`${check.hasData ? '✓' : '✗'} ${check.item}`, margin + 5, yPos);
          yPos += 5;
        });
        
        const completedItems = checklistItems.filter(c => c.hasData).length;
        const completionPercent = Math.round((completedItems / checklistItems.length) * 100);
        yPos += 4;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(completionPercent >= 70 ? 34 : completionPercent >= 50 ? 180 : 220, 
                         completionPercent >= 70 ? 139 : completionPercent >= 50 ? 80 : 53, 
                         completionPercent >= 70 ? 34 : completionPercent >= 50 ? 0 : 69);
        doc.text(`Profile Completion: ${completedItems}/${checklistItems.length} (${completionPercent}%)`, margin + 5, yPos);
        yPos += 8;
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
        doc.text('Gradia - Candidate Profile Report | Skillory AI Compatible', margin, 290);
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
