// End-to-end check against a fake Canvas: sign-in callback, docx, upload, submit, revoke.
// Run: npm test   (writes test/out/*.docx so you can open them in Word)
import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import GO from '../public/organizers.js';

const calls = [];
const fake = http.createServer(async (req, res) => {
  let body = Buffer.alloc(0);
  for await (const c of req) body = Buffer.concat([body, c]);
  calls.push({ m: req.method, u: req.url, auth: req.headers.authorization || '', len: body.length });
  const send = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.url === '/login/oauth2/token' && req.method === 'POST') return send({ access_token: 'TOKEN123', user: { id: 42, name: 'Sam Rivera' } });
  if (req.url === '/login/oauth2/token' && req.method === 'DELETE') return send({});
  if (req.url.startsWith('/api/v1/courses/111/')) return send({ errors: [{ message: 'user not authorized' }] }, 401);
  if (req.url.endsWith('/submissions/self/files')) return send({ upload_url: `http://localhost:${port}/upload`, upload_params: { key: 'abc' } });
  if (req.url === '/upload') { res.writeHead(302, { Location: `http://localhost:${port}/api/v1/files/9/create_success` }); return res.end(); }
  if (req.url.startsWith('/api/v1/files/9')) return send({ id: 9 });
  if (req.url.endsWith('/submissions') && req.method === 'POST') return send({ id: 1, workflow_state: 'submitted', body: JSON.parse(body.toString()) });
  if (req.url === '/api/v1/users/self/profile') return send({ primary_email: 'sam.rivera@student.example.org' });
  send({ error: 'unknown' }, 404);
});
await new Promise(r => fake.listen(0, r));
const port = fake.address().port;

process.env.CANVAS_BASE_URL = `http://localhost:${port}`;
process.env.CANVAS_CLIENT_ID = '1000';
process.env.CANVAS_CLIENT_SECRET = 'secret';
process.env.SESSION_SECRET = 'x'.repeat(40);

const { default: start } = await import('../netlify/functions/auth-start.mjs');
const { default: callback } = await import('../netlify/functions/auth-callback.mjs');
const { default: submit } = await import('../netlify/functions/submit.mjs');
const { buildDocx } = await import('../netlify/lib/build-docx.mjs');

// 1. sign-in redirect carries a signed state; callback turns code into a sealed session
const r1 = await start(new Request('https://go.example/.netlify/functions/auth-start'));
const loc = new URL(r1.headers.get('location'));
assert.equal(loc.pathname, '/login/oauth2/auth');
const r2 = await callback(new Request(`https://go.example/.netlify/functions/auth-callback?code=abc&state=${encodeURIComponent(loc.searchParams.get('state'))}`));
const html = await r2.text();
const session = html.match(/"session":"([^"]+)"/)[1];
assert.ok(!html.includes('TOKEN123'), 'token must not appear in page');
const bad = await (await callback(new Request('https://go.example/x?code=abc&state=forged.sig'))).text();
assert.ok(bad.includes('"ok":false'));

// 2. submit: upload + online_upload submission + revoke
const sample = `- Compare and contrast Ponyboy and Johnny in The Outsiders.\n- Include at least three similarities and three differences.`;
const cfg = GO.buildConfig(GO.match(sample)[0].org, 'Ponyboy vs. Johnny', sample);
cfg.canvas = { courseId: '123', assignmentId: '456' };
const answers = { name: 'typed name', s: { a: ['Greaser who loves movies', 'Wants more than the gang'], both: ['Greasers', 'Lose their parents', 'Sensitive'], b: ['Kills Bob', 'Quiet and scared'] }, checks: [true, false] };
const r3 = await submit(new Request('https://go.example/.netlify/functions/submit', { method: 'POST', body: JSON.stringify({ cfg, answers, session }) }));
const out = await r3.json();
assert.equal(out.ok, true, JSON.stringify(out));
assert.equal(out.fileName, 'Ponyboy vs Johnny - Sam Rivera.docx');
const subCall = calls.find(c => c.u === '/api/v1/courses/123/assignments/456/submissions');
assert.ok(subCall && subCall.auth === 'Bearer TOKEN123');
assert.ok(calls.some(c => c.m === 'DELETE' && c.u === '/login/oauth2/token'), 'token revoked');
assert.ok(calls.find(c => c.u === '/upload').len > 3000, 'docx bytes uploaded');

// 2b. one organizer attached to several assignments: skips the course the student isn't in
const r2b = await callback(new Request(`https://go.example/.netlify/functions/auth-callback?code=abc&state=${encodeURIComponent(new URL((await start(new Request('https://go.example/x'))).headers.get('location')).searchParams.get('state'))}`));
const session2 = (await r2b.text()).match(/"session":"([^"]+)"/)[1];
const multi = { ...cfg, targets: [{ courseId: '111', assignmentId: '1' }, { courseId: '123', assignmentId: '789' }] };
const before = calls.length;
const r3b = await (await submit(new Request('https://go.example/x', { method: 'POST', body: JSON.stringify({ cfg: multi, answers, session: session2 }) }))).json();
assert.equal(r3b.ok, true, JSON.stringify(r3b));
assert.ok(calls.slice(before).some(c => c.u === '/api/v1/courses/123/assignments/789/submissions'), 'submitted to the second course');

// 3. expired/forged session is refused
const r4 = await submit(new Request('https://go.example/x', { method: 'POST', body: JSON.stringify({ cfg, answers, session: 'nope' }) }));
assert.equal(r4.status, 401);

// 4. every organizer builds a docx
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
for (const o of GO.ORGS) {
  const c = GO.buildConfig(o, o.name + ' sample', 'Sample criteria line one.\nSample line two.');
  const a = { name: 'Test Student', s: {} };
  for (const card of GO.cards(c)) {
    if (card.idx !== null) (a.s[card.sid] ||= [])[card.idx] = `Answer for ${card.label}`;
    else a.s[card.sid] = card.kind === 'list' ? ['First point', 'Second point'] : `Answer for ${card.label}`;
  }
  const buf = await buildDocx(c, a);
  fs.writeFileSync(new URL(`./out/${o.id}.docx`, import.meta.url), buf);
}
console.log(`All checks passed. ${calls.length} fake Canvas calls. ${GO.ORGS.length} sample .docx files in test/out/.`);
fake.close();
