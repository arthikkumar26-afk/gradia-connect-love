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
        yPos += 2;
        
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
