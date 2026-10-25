// Turns a filled-in organizer into a .docx (Word) file.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle, HeadingLevel,
} from 'docx';
import GO from '../../public/organizers.js';

// Same sticky-note colors as the page (light theme).
const FILLS = ['FFF0A8', 'C9F2DC', 'CFE8FF', 'FFD6CC', 'E6DCFF'];
const EDGES = ['E7C84A', '5CC28F', '62A8E8', 'F08A72', '9C84E6'];
const FONT = 'Verdana';

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: opts.size || 22, bold: opts.bold, italics: opts.italics, color: opts.color });
}

function cardParagraphs(card, answers) {
  const paras = [
    new Paragraph({ children: [run(card.label, { bold: true, size: 26 })], spacing: { after: 60 } }),
    new Paragraph({ children: [run(card.hint || '', { italics: true, size: 18, color: '5B6578' })], spacing: { after: 120 } }),
  ];
  const v = GO.valueOf(card, answers);
  if (Array.isArray(v)) {
    const filled = v.filter(x => x.trim());
    if (!filled.length) paras.push(new Paragraph({ children: [run('(left blank)', { italics: true, color: '8A93A5' })] }));
    for (const item of filled) paras.push(new Paragraph({ children: [run('• ' + item.trim())], spacing: { after: 80 } }));
  } else {
    const lines = v.trim() ? v.trim().split(/\n+/) : [];
    if (!lines.length) paras.push(new Paragraph({ children: [run('(left blank)', { italics: true, color: '8A93A5' })] }));
    for (const line of lines) paras.push(new Paragraph({ children: [run(line)], spacing: { after: 80 } }));
  }
  return paras;
}

function border(color) {
  const b = { style: BorderStyle.SINGLE, size: 12, color };
  return { top: b, bottom: b, left: b, right: b };
}

function cell(card, answers, widthPct, span) {
  return new TableCell({
    children: cardParagraphs(card, answers),
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: FILLS[card.color] },
    borders: border(EDGES[card.color]),
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    columnSpan: span,
    margins: { top: 140, bottom: 140, left: 160, right: 160 },
  });
}

function gridTable(rows, answers) {
  const cols = Math.max(...rows.map(r => r.length));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(r => new TableRow({
      children: r.map(c => cell(c, answers, Math.floor(100 / cols) * (r.length === 1 ? cols : 1), r.length === 1 ? cols : undefined)),
    })),
  });
}

function arrow() {
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [run('↓', { size: 32, color: '2346C8', bold: true })], spacing: { before: 40, after: 40 } });
}

function organizerBlocks(cfg, answers) {
  const cs = GO.cards(cfg);
  const chunk = (arr, n) => arr.reduce((rows, c, i) => (i % n ? rows[rows.length - 1].push(c) : rows.push([c]), rows), []);
  switch (cfg.layout) {
    case 'doublebubble': {
      const [ta, tb, ...rest] = cs;
      const a = GO.topicName(ta, answers) || 'Topic A', b = GO.topicName(tb, answers) || 'Topic B';
      return [
        new Paragraph({ children: [run('Comparing: ', { bold: true }), run(a), run('  and  ', { bold: true }), run(b)], spacing: { after: 160 } }),
        gridTable([rest.map((c, i) => {
          const named = { a: GO.topicIsOpen(ta) && a, b: GO.topicIsOpen(tb) && b }[c.sid];
          return { ...c, color: [2, 4, 3][i], label: named ? 'Only ' + named : c.label };
        })], answers),
      ];
    }
    case 'columns':
      return [gridTable(chunk(cs, cs.length === 2 || cs.length === 4 ? 2 : 3), answers)];
    case 'quad': {
      const [word, ...rest] = cs;
      return [gridTable([[rest[0], rest[1]], [word], [rest[2], rest[3]]], answers)];
    }
    default: {
      // chain, stack and web read top to bottom, one card per row
      const out = [];
      cs.forEach((c, i) => {
        if (i && cfg.layout !== 'web') out.push(arrow());
        if (i && cfg.layout === 'web') out.push(new Paragraph({ children: [], spacing: { after: 80 } }));
        out.push(gridTable([[c]], answers));
      });
      return out;
    }
  }
}

export function fileName(cfg, studentName) {
  const clean = s => (s || '').replace(/[^\w\- ]+/g, '').trim().slice(0, 60);
  return [clean(cfg.title) || 'Organizer', clean(studentName)].filter(Boolean).join(' - ') + '.docx';
}

export async function buildDocx(cfg, answers, { studentName, when = new Date() } = {}) {
  const name = studentName || (answers && answers.name) || '';
  const date = when.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  const checks = (answers && answers.checks) || [];

  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [run(cfg.title, { size: 40, bold: true })] }),
    new Paragraph({ children: [run('Name: ', { bold: true }), run(name || '________________'), run('     Date: ', { bold: true }), run(date)], spacing: { after: 60 } }),
    new Paragraph({ children: [run('Organizer: ', { bold: true }), run(cfg.name)], spacing: { after: 160 } }),
  ];
  if (cfg.directions) children.push(new Paragraph({ children: [run(cfg.directions, { italics: true })], spacing: { after: 240 } }));
  children.push(...organizerBlocks(cfg, answers));

  if (cfg.checklist && cfg.checklist.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run('Assignment checklist', { bold: true, size: 28 })], spacing: { before: 360, after: 120 } }));
    cfg.checklist.forEach((item, i) => {
      children.push(new Paragraph({ children: [run(checks[i] ? '☑  ' : '☐  ', { size: 24 }), run(item)], spacing: { after: 80 } }));
    });
  }

  const doc = new Document({
    creator: name || 'Student',
    title: cfg.title,
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children }],
  });
  return Packer.toBuffer(doc);
}
