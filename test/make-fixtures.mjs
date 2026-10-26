// Builds a sample teacher handout (.docx) for the upload test. PDF is made from it with LibreOffice.
import fs from 'node:fs';
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
const p = t => new Paragraph({ text: t });
const doc = new Document({ sections: [{ children: [
  p('Name: ____________   Date: ________   Period: ____'),
  new Paragraph({ heading: HeadingLevel.HEADING_1, text: 'Four-Day School Week Argument' }),
  p('Directions:'),
  p('1. Read both articles about the four-day school week.'),
  p('2. State your claim: should our school switch to a four-day week?'),
  p('3. Give three pieces of evidence from the articles.'),
  p('4. Explain your reasoning for each piece of evidence.'),
  p('5. Address one counterargument.'),
] }] });
fs.writeFileSync(new URL('./fixtures/argument-handout.docx', import.meta.url), await Packer.toBuffer(doc));
