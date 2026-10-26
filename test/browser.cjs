// Browser test: static site + functions + fake Canvas, driven by Playwright.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
(async () => {
  const shots = process.argv[2];
  // fake Canvas
  const calls = [];
  const canvas = http.createServer(async (req, res) => {
    let body = Buffer.alloc(0); for await (const c of req) body = Buffer.concat([body, c]);
    calls.push(req.method + ' ' + req.url.split('?')[0]);
    const u = new URL(req.url, 'http://x');
    const send = (o, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (u.pathname === '/login/oauth2/auth') { res.writeHead(302, { Location: `${u.searchParams.get('redirect_uri')}?code=abc&state=${encodeURIComponent(u.searchParams.get('state'))}` }); return res.end(); }
    if (u.pathname === '/login/oauth2/token') return send(req.method === 'POST' ? { access_token: 'T', user: { id: 1, name: 'Sam Rivera' } } : {});
    if (u.pathname.endsWith('/self/files')) return send({ upload_url: `http://localhost:${canvas.address().port}/upload`, upload_params: {} });
    if (u.pathname === '/upload') return send({ id: 9 }, 201);
    if (u.pathname.endsWith('/submissions')) return send({ id: 1 });
    send({}, 404);
  });
  await new Promise(r => canvas.listen(0, r));
  Object.assign(process.env, { CANVAS_BASE_URL: `http://localhost:${canvas.address().port}`, CANVAS_CLIENT_ID: '1', CANVAS_CLIENT_SECRET: 's', SESSION_SECRET: 'y'.repeat(40) });
  const fns = {};
  // VERCEL=1 runs the same flow through the Vercel entry points in api/
  for (const n of ['auth-start', 'auth-callback', 'submit', 'docx']) {
    if (process.env.VERCEL) { const m = await import(path.resolve(__dirname, `../api/${n}.mjs`)); fns[n] = m.GET || m.POST; }
    else fns[n] = (await import(path.resolve(__dirname, `../netlify/functions/${n}.mjs`))).default;
  }
  const site = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://localhost:${site.address().port}`);
    if (u.pathname.startsWith('/.netlify/functions/') || u.pathname.startsWith('/api/')) {
      let body = Buffer.alloc(0); for await (const c of req) body = Buffer.concat([body, c]);
      const r = await fns[u.pathname.split('/').pop()](new Request(u, { method: req.method, headers: req.headers, body: req.method === 'POST' ? body : undefined }));
      res.writeHead(r.status, Object.fromEntries(r.headers)); return res.end(Buffer.from(await r.arrayBuffer()));
    }
    const f = path.join(__dirname, '../public', u.pathname === '/' ? 'index.html' : u.pathname);
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(fs.readFileSync(f));
  });
  await new Promise(r => site.listen(0, r));
  const base = `http://localhost:${site.address().port}/`;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base); await page.waitForTimeout(800);
  await page.screenshot({ path: `${shots}/builder.png`, fullPage: true });
  for (const i of [1, 2, 3]) { await page.click(`[data-sample="${i}"]`); await page.waitForTimeout(300); await page.locator('#preview').screenshot({ path: `${shots}/sample${i}.png` }); }
  await page.click('[data-sample="0"]');
  await page.fill('#c-canvas', 'https://cciubva.instructure.com/courses/123/assignments/456');
  const note = await page.textContent('#canvas-note');
  const link = await page.inputValue('#share-link');

  const st = await ctx.newPage(); st.on('pageerror', e => errors.push(e.message));
  await st.goto(link); await st.waitForTimeout(500);
  await st.fill('#st-name', 'Sam');
  await st.fill('#f-a-0', 'Loves movies and sunsets');
  await st.fill('#f-both-0', 'Both are greasers');
  await st.check('#chk-0');
  await st.waitForTimeout(600);
  await st.reload(); await st.waitForTimeout(400);
  const kept = await st.inputValue('#f-a-0');
  const [pop] = await Promise.all([st.waitForEvent('popup'), st.click('#turn-in')]);
  await st.waitForSelector('.status.ok', { timeout: 10000 }).catch(() => {});
  const result = await st.textContent('#status');
  const [dl] = await Promise.all([st.waitForEvent('download'), st.click('#download')]);
  await st.screenshot({ path: `${shots}/student.png`, fullPage: true });
  const phone = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
  const pp = await phone.newPage(); await pp.goto(link); await pp.waitForTimeout(600); await pp.click('.looks [data-look="space"]'); await pp.waitForTimeout(300);
  await pp.screenshot({ path: `${shots}/phone-dark.png`, fullPage: true });
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(JSON.stringify({ note, linkLen: link.length, kept, result, download: dl.suggestedFilename(), overflow, errors, calls }, null, 1));
  await browser.close(); site.close(); canvas.close();
})();
