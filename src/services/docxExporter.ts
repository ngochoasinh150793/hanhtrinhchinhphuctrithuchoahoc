import { Document, Paragraph, TextRun, Packer, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { Question, Subject } from '../types';

export const exportQuestionsToDocx = async (title: string, questions: Question[], subjectName: string) => {
  const children: any[] = [
    new Paragraph({
      text: "TRƯỜNG ........",
      heading: HeadingLevel.HEADING_3,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: title.toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      text: `Chủ đề: ${subjectName}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({ text: `Chủ đề: ${subjectName}`, italics: true, size: 24 }),
      ],
    }),
    new Paragraph({
      text: "Họ và tên thí sinh: ..............................................................",
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: "Lớp: .........................   Thời gian làm bài: 45 phút.",
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: "-------------------------------------------------------------------------------------------------",
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  questions.forEach((q, index) => {
    // Thêm câu hỏi
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Câu ${index + 1}: `, bold: true, size: 24 }),
          new TextRun({ text: q.content, size: 24 }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    // Thêm các lựa chọn (A, B, C, D)
    const labels = ['A.', 'B.', 'C.', 'D.'];
    const optionsParagraphs = q.options.map((opt, i) => {
      return new Paragraph({
        children: [
          new TextRun({ text: `${labels[i]} `, bold: true, size: 24 }),
          new TextRun({ text: opt, size: 24 }),
        ],
        indent: { left: 400 },
        spacing: { after: 100 },
      });
    });

    children.push(...optionsParagraphs);
  });

  // Đáp án cuối trang
  children.push(
    new Paragraph({
      text: "--------------------------- ĐÁP ÁN ---------------------------",
      alignment: AlignmentType.CENTER,
      pageBreakBefore: true,
      spacing: { before: 400, after: 400 },
    })
  );

  questions.forEach((q, index) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Câu ${index + 1}: `, bold: true, size: 24 }),
          new TextRun({ text: q.correctAnswer, size: 24, color: "FF0000" }),
          new TextRun({ break: 1 }),
          new TextRun({ text: `Giải thích: ${q.explanation}`, size: 22, italics: true }),
        ],
        spacing: { before: 100, after: 200 },
        indent: { left: 400 }
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `De_Kiem_Tra_${subjectName.replace(/\s+/g, '_')}.docx`);
};
