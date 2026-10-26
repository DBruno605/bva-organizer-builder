// Teacher pastes a Canvas assignment or page link: read its title and description
// with the teacher's own sign-in, then sign the token out.
import { BASE, readContent, revoke } from '../lib/canvas.mjs';
import { unseal } from '../lib/session.mjs';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Bad request.' }, 400); }
  const sess = unseal(body && body.session);
  if (!sess) return json({ error: 'Your Canvas sign-in expired. Click Get it again.' }, 401);

  // Only the ids are taken from the link; the request always goes to our Canvas.
  const link = String(body.url || '');
  const a = link.match(/courses\/(\d+)\/assignments\/(\d+)/);
  const p = link.match(/courses\/(\d+)\/pages\/([^/?#\s]+)/);
  if (!a && !p) {
    await revoke(sess.token);
    return json({ error: 'That doesn\'t look like a Canvas assignment or page link. It should contain /courses/…/assignments/… or /courses/…/pages/….' }, 400);
  }
  try {
    const out = await readContent(sess.token, a ? { courseId: a[1], assignmentId: a[2] } : { courseId: p[1], page: p[2] });
    return json({ ok: true, ...out, base: BASE });
  } catch (e) {
    console.error(e);
    const msg = e.status === 401 || e.status === 403 || e.status === 404
      ? 'Canvas wouldn\'t share that one. Make sure you\'re signed in as a teacher in that course.'
      : 'Canvas didn\'t answer. Try again in a minute.';
    return json({ error: msg }, 502);
  } finally {
    await revoke(sess.token);
  }
};
