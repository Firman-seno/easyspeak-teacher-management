import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { MONTHS, SKILLS, formatDate } from "./domain";
import type { Lesson, MonthlyReport, Project, Student } from "./domain";

const NAVY: [number, number, number] = [23, 37, 66];
const BLUE: [number, number, number] = [37, 84, 199];
const GRAY: [number, number, number] = [90, 100, 118];

export type ReportPdfInput = {
  report: MonthlyReport;
  student: Student;
  lessons: Lesson[];
  projects: Project[];
  schoolName: string;
  teacherName: string;
};

export function buildReportPdf({
  report,
  student,
  lessons,
  projects,
  schoolName,
  teacherName,
}: ReportPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const period = `${MONTHS[report.month - 1]} ${report.year}`;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 96, "F");
  doc.setFillColor(...BLUE);
  doc.circle(margin + 16, 46, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ES", margin + 16, 50, { align: "center" });
  doc.setFontSize(15);
  doc.text(schoolName, margin + 44, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Student Progress Report", margin + 44, 60);
  doc.setFontSize(9);
  doc.text(`Reporting Period: ${period}`, margin + 44, 76);

  let y = 128;
  const section = (title: string) => {
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), margin, y);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(1.2);
    doc.line(margin, y + 5, margin + 48, y + 5);
    y += 16;
  };

  const table = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 5, textColor: GRAY },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 251] },
      theme: "grid",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  };

  section("Student Information");
  table(
    ["Field", "Detail", "Field", "Detail"],
    [
      ["Name", student.name, "Student ID", student.student_id],
      ["Program", student.program, "Level", report.level ?? student.current_level],
      ["Teacher", teacherName, "Period", period],
    ],
  );

  section("Attendance Summary");
  table(
    ["Total Meetings", "Present", "Late", "Excused", "Absent", "Attendance Rate"],
    [
      [
        report.total_meetings,
        report.present,
        report.late,
        report.excused,
        report.absent,
        `${report.attendance_rate}%`,
      ],
    ],
  );

  section("Lessons & Projects");
  table(
    ["Lessons Completed", "Projects Assigned", "Projects Completed", "Project Completion"],
    [
      [
        report.lessons_completed,
        report.projects_assigned,
        report.projects_completed,
        `${
          report.projects_assigned
            ? Math.round((report.projects_completed / report.projects_assigned) * 100)
            : 0
        }%`,
      ],
    ],
  );

  const skills = (report.skills ?? {}) as Record<string, number>;
  section("Skill Analysis");
  table(
    ["Skill", "Score", "Skill", "Score"],
    [
      ["Speaking", `${skills["speaking"] ?? 0}%`, "Writing", `${skills["writing"] ?? 0}%`],
      ["Listening", `${skills["listening"] ?? 0}%`, "Vocabulary", `${skills["vocabulary"] ?? 0}%`],
      ["Reading", `${skills["reading"] ?? 0}%`, "Grammar", `${skills["grammar"] ?? 0}%`],
      ["Overall Progress", `${report.overall_progress}%`, "", ""],
    ],
  );

  if (lessons.length) {
    section("Materials Covered");
    table(
      ["Date", "Title", "Topic", "Grammar"],
      lessons.map((l) => [formatDate(l.date), l.title, l.topic ?? "-", l.grammar ?? "-"]),
    );
  }

  if (projects.length) {
    section("Projects Completed");
    table(
      ["Title", "Type", "Score", "Completed"],
      projects.map((p) => [p.title, p.type, p.score ?? "-", formatDate(p.completed_date)]),
    );
  }

  const paragraph = (title: string, text: string) => {
    if (y > 660) {
      doc.addPage();
      y = 60;
    }
    section(title);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    const lines = doc.splitTextToSize(text || "—", pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 18;
  };

  paragraph("Teacher's Evaluation", report.teacher_evaluation ?? "");
  paragraph("Recommendations", report.recommendations ?? "");

  if (y > 640) {
    doc.addPage();
    y = 80;
  }
  const footerY = Math.max(y + 30, 700);
  doc.setDrawColor(200, 206, 218);
  doc.setLineWidth(0.7);
  doc.line(margin, footerY, margin + 170, footerY);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(teacherName, margin, footerY + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("Teacher Signature", margin, footerY + 30);
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, pageW - margin, footerY + 16, {
    align: "right",
  });

  return doc;
}

export function skillsFromProgress(p: Partial<Record<string, number>>) {
  return Object.fromEntries(SKILLS.map((s) => [s, p[s] ?? 0]));
}
