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
  questions?: any[];
  answers?: any[];
  question_scores?: any[];
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

  // Debug: log JAM stage index, name/category, and answers[0] before PDF generation
  try {
    const debugRows = stageResults.map((s, idx) => {
      const qs: any[] = Array.isArray(s.questions) ? s.questions : [];
      const ans: any[] = Array.isArray(s.answers) ? s.answers : [];
      const firstQCategory = qs[0] && typeof qs[0] === "object" ? (qs[0] as any).category : undefined;
      const isJam = /jam|just a minute/i.test(s.stage_name || "") || firstQCategory === "JAM";
      return {
        arrayIndex: idx,
        stage_order: s.stage_order,
        stage_name: s.stage_name,
        firstQuestionCategory: firstQCategory,
        isJam,
        answersLength: ans.length,
        answer0Type: typeof ans[0],
        answer0Preview:
          typeof ans[0] === "string"
            ? ans[0].slice(0, 300)
            : ans[0] != null
            ? JSON.stringify(ans[0]).slice(0, 300)
            : null,
      };
    });
    // eslint-disable-next-line no-console
    console.groupCollapsed("[MockInterviewReportPdf] Debug — stages before PDF");
    // eslint-disable-next-line no-console
    console.table(debugRows);
    // eslint-disable-next-line no-console
    console.log("JAM stages:", debugRows.filter((r) => r.isJam));
    // eslint-disable-next-line no-console
    console.groupEnd();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[MockInterviewReportPdf] debug logging failed", e);
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  const writeWrapped = (text: string, x: number, options?: { size?: number; style?: "normal" | "bold" | "italic"; color?: [number, number, number]; maxWidthOverride?: number }) => {
    const { size = 10, style = "normal", color = [40, 40, 40], maxWidthOverride } = options || {};
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const maxWidth = maxWidthOverride ?? (pageWidth - x - PAGE_MARGIN);
    const lines = doc.splitTextToSize(text || "", maxWidth);
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
      y += 1;
    }

    // Questions & Answers (incl. JAM transcript)
    const qs: any[] = Array.isArray(s.questions) ? s.questions : [];
    const ans: any[] = Array.isArray(s.answers) ? s.answers : [];
    const qScores: any[] = Array.isArray(s.question_scores) ? s.question_scores : [];
    const isJam = /jam|just a minute/i.test(s.stage_name || "") ||
      (qs[0] && (qs[0] as any).category === "JAM");

    if (isJam) {
      const transcript = typeof ans[0] === "string" ? ans[0] : "";
      if (transcript) {
        y += 2;
        writeWrapped("What You Said (Live Transcript):", PAGE_MARGIN + 3, { size: 9, style: "bold", color: [55, 65, 145] });
        writeWrapped(transcript, PAGE_MARGIN + 6, { size: 9, color: [40, 40, 40] });
        y += 1;
      }
    } else if (qs.length > 0) {
      y += 2;
      writeWrapped("Questions & Answers:", PAGE_MARGIN + 3, { size: 9, style: "bold", color: [55, 65, 145] });
      qs.forEach((q: any, i: number) => {
        const qText = typeof q === "string" ? q : (q?.question || "");
        const qType = (typeof q === "object" && q?.type) || "text";
        const opts: string[] = (typeof q === "object" && Array.isArray(q?.options)) ? q.options : [];
        const correct: string | undefined = typeof q === "object" ? q?.correctAnswer : undefined;
        const aRaw = ans[i];
        const aText = typeof aRaw === "string" ? aRaw : (aRaw?.answer ?? aRaw?.code ?? (aRaw != null ? JSON.stringify(aRaw) : ""));
        const sc = qScores.find((x: any) => x?.questionId === (q?.id ?? i + 1));

        ensureSpace(10);
        writeWrapped(`Q${i + 1}. ${qText}`, PAGE_MARGIN + 6, { size: 9, style: "bold", color: [30, 30, 30] });

        if (qType === "multiple_choice" && opts.length) {
          opts.forEach((opt, oi) => {
            const letter = String.fromCharCode(65 + oi);
            const isChosen = (aText || "").trim() === opt.trim();
            const isCorrect = !!correct && correct.trim() === opt.trim();
            let tag = "";
            let color: [number, number, number] = [80, 80, 80];
            if (isCorrect && isChosen) { tag = " (Your answer - Correct)"; color = [22, 130, 50]; }
            else if (isCorrect) { tag = " (Correct answer)"; color = [22, 130, 50]; }
            else if (isChosen) { tag = " (Your answer)"; color = [200, 40, 40]; }
            writeWrapped(`   ${letter}. ${opt}${tag}`, PAGE_MARGIN + 8, {
              size: 9,
              style: (isChosen || isCorrect) ? "bold" : "normal",
              color,
            });
          });
          if (!aText) {
            writeWrapped("   (Not answered)", PAGE_MARGIN + 8, { size: 9, style: "italic", color: [150, 150, 150] });
          }
        } else {
          writeWrapped(`Your Answer: ${aText || "(no answer)"}`, PAGE_MARGIN + 8, { size: 9, color: [60, 60, 60] });
        }

        if (sc) {
          writeWrapped(`Score: ${sc.score ?? "-"}/100${sc.feedback ? ` — ${sc.feedback}` : ""}`, PAGE_MARGIN + 8, { size: 9, style: "italic", color: [90, 90, 90] });
        }
        y += 1;
      });
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
