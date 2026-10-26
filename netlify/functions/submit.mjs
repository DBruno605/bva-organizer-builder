// Builds the .docx, turns it in to the Canvas assignment as the student,
// emails the student a copy, then signs the token out.
import { buildDocx, fileName } from '../lib/build-docx.mjs';
import { submitFile, profile, revoke } from '../lib/canvas.mjs';
import { mailConfigured, sendCopy } from '../lib/mail.mjs';
import { unseal } from '../lib/session.mjs';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function maskEmail(e) {
  const [u, d] = String(e).split('@');
  return d ? u.slice(0, 2) + '•••@' + d : '';
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const { cfg, answers, session } = body || {};
  const sess = unseal(session);
  if (!sess) return json({ error: 'Your Canvas sign-in expired. Click Turn in again.', code: 'auth' }, 401);
  // One organizer can be attached to several assignments (sections, courses).
  // Turn in to the first one this student can submit to.
  const targets = (cfg && Array.isArray(cfg.targets) && cfg.targets.length ? cfg.targets : [cfg && cfg.canvas])
    .filter(t => t && t.courseId && t.assignmentId);
  if (!targets.length) {
    return json({ error: 'This organizer is not linked to a Canvas assignment yet. Ask your teacher for the updated link.' }, 400);
  }

  const name = sess.name || (answers && answers.name) || '';
  const fname = fileName(cfg, name);
  const bytes = await buildDocx(cfg, answers, { studentName: name });

  let submitted = null, lastErr = null;
  for (const t of targets) {
    try {
      await submitFile(sess.token, { courseId: t.courseId, assignmentId: t.assignmentId, fileName: fname, bytes });
      submitted = t;
      break;
    } catch (e) {
      lastErr = e;
      if (![401, 403, 404].includes(e.status)) break; // not this student's course: try the next one
    }
  }
  if (!submitted) {
    await revoke(sess.token);
    console.error(lastErr);
    const msg = lastErr && [401, 403, 404].includes(lastErr.status)
      ? 'Canvas would not accept this submission. Check that you are in this class and the assignment is open.'
      : 'Canvas did not accept the file. Try again, or download your copy and upload it in Canvas.';
    return json({ error: msg }, 502);
  }

  let emailed = null, emailError = null;
  if (mailConfigured()) {
    try {
      const p = await profile(sess.token);
      if (p.primary_email) {
        await sendCopy({ to: p.primary_email, studentName: name, title: cfg.title, fileName: fname, bytes });
        emailed = maskEmail(p.primary_email);
      } else {
        emailError = 'Your Canvas account has no email address, so no copy was emailed.';
      }
    } catch (e) {
      console.error(e);
      emailError = 'Your work was turned in, but the email copy could not be sent.';
    }
  }
  await revoke(sess.token);
  return json({ ok: true, fileName: fname, emailed, emailError, submittedAt: new Date().toISOString() });
};
