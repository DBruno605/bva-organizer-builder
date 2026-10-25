// Emails the student their copy through the school's SMTP account.
import nodemailer from 'nodemailer';

export function mailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendCopy({ to, studentName, title, fileName, bytes }) {
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const first = (studentName || '').split(' ')[0] || 'there';
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Your copy: ${title}`,
    text:
      `Hi ${first},\n\n` +
      `Your graphic organizer "${title}" was turned in to Canvas. ` +
      `A copy is attached so you can keep it and study from it.\n\n` +
      `This is an automatic message. Questions about the assignment go to your teacher in Canvas.`,
    attachments: [{ filename: fileName, content: Buffer.from(bytes) }],
  });
}
