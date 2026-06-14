import jsPDF from "jspdf";

interface StageResult {
  stage_name: string;
  stage_order: number;
  ai_score?: number;
  ai_feedback?: string;
  passed?: boolean;
  completed_at?: string;
  strengths?: string[];
  improvements?: string[];
}

interface ReportOptions {
  candidateName: string;
  interviewType?: string;
  pipelineType?: string;
  stageResults: StageResult[];
  sessionStartedAt?: string;
}

const PAGE_MARGIN = 14;

export const generateMockInterviewReportPdf = ({
  candidateName,
  interviewType,
  pipelineType,
  stageResults,
  sessionStartedAt,
}: ReportOptions) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = PAGE_MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  const writeWrapped = (text: string, x: number, options?: { size?: number; style?: "normal" | "bold"; color?: [number, number, number] }) => {
    const { size = 10, style = "normal", color = [40, 40, 40] } = options || {};
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const maxWidth = pageWidth - x - PAGE_MARGIN;
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      ensureSpace(size * 0.5);
      doc.text(line, x, y);
      y += size * 0.5;
    });
  };

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Mock Interview Report", PAGE_MARGIN, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE_MARGIN, 22);
  y = 36;

  // Candidate info
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Candidate Details", PAGE_MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Name: ${candidateName}`, PAGE_MARGIN, y); y += 5;
  if (interviewType) { doc.text(`Interview Type: ${interviewType}`, PAGE_MARGIN, y); y += 5; }
  if (pipelineType) { doc.text(`Pipeline: ${pipelineType}`, PAGE_MARGIN, y); y += 5; }
  if (sessionStartedAt) { doc.text(`Started: ${new Date(sessionStartedAt).toLocaleString()}`, PAGE_MARGIN, y); y += 5; }
  y += 4;

  // Overall score
  const scored = stageResults.filter(r => typeof r.ai_score === "number" && r.stage_order !== 1 && r.stage_order !== 3);
  const overall = scored.length > 0 ? scored.reduce((s, r) => s + (r.ai_score || 0), 0) / scored.length : 0;
  const passed = overall >= 60;

  doc.setDrawColor(220);
  doc.setFillColor(passed ? 220 : 254, passed ? 252 : 243, passed ? 231 : 199);
  doc.roundedRect(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN * 2, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text("Overall Performance", PAGE_MARGIN + 4, y + 7);
  doc.setFontSize(16);
  doc.setTextColor(passed ? 22 : 180, passed ? 163 : 83, passed ? 74 : 9);
  doc.text(`${overall.toFixed(1)}%`, pageWidth - PAGE_MARGIN - 4, y + 11, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    passed ? "Eligible for next round" : "Under review",
    PAGE_MARGIN + 4,
    y + 14
  );
  y += 24;

  // Stage breakdown
  ensureSpace(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text("Stage-by-Stage Breakdown", PAGE_MARGIN, y);
  y += 7;

  const sorted = [...stageResults].sort((a, b) => a.stage_order - b.stage_order);
  sorted.forEach((s) => {
    ensureSpace(30);
    const showScore = typeof s.ai_score === "number" && s.stage_order !== 1 && s.stage_order !== 3;
    doc.setDrawColor(230);
    doc.setFillColor(249, 250, 251);
    const blockStart = y;
    doc.roundedRect(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN * 2, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(`${s.stage_order}. ${s.stage_name}`, PAGE_MARGIN + 3, y + 5.5);
    if (showScore) {
      const score = s.ai_score!;
      const col: [number, number, number] = score >= 80 ? [22, 163, 74] : score >= 60 ? [217, 119, 6] : [220, 38, 38];
      doc.setTextColor(...col);
      doc.text(`${score.toFixed(0)}%`, pageWidth - PAGE_MARGIN - 4, y + 5.5, { align: "right" });
    } else if (s.completed_at) {
      doc.setTextColor(22, 163, 74);
      doc.text("Completed", pageWidth - PAGE_MARGIN - 4, y + 5.5, { align: "right" });
    }
    y += 11;

    if (s.ai_feedback) {
      writeWrapped(s.ai_feedback, PAGE_MARGIN + 3, { size: 9, color: [70, 70, 70] });
      y += 2;
    }
    if (s.strengths && s.strengths.length > 0) {
      writeWrapped("Strengths:", PAGE_MARGIN + 3, { size: 9, style: "bold", color: [22, 101, 52] });
      s.strengths.forEach(st => writeWrapped(`• ${st}`, PAGE_MARGIN + 6, { size: 9, color: [40, 80, 50] }));
      y += 1;
    }
    if (s.improvements && s.improvements.length > 0) {
      writeWrapped("Areas to Improve:", PAGE_MARGIN + 3, { size: 9, style: "bold", color: [146, 64, 14] });
      s.improvements.forEach(im => writeWrapped(`• ${im}`, PAGE_MARGIN + 6, { size: 9, color: [120, 70, 20] }));
    }
    y += 4;
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gradia Mock Interview Report • Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 6, { align: "center" });
  }

  const filename = `${candidateName.replace(/\s+/g, "_")}_Mock_Interview_Report.pdf`;
  doc.save(filename);
};
