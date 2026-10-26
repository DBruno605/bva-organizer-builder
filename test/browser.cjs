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
    if (req.method === 'GET' && u.pathname === '/api/v1/courses/123/assignments/789') return send({ name: 'Ponyboy and Johnny Compared', description: '<p>Directions:</p><ul><li>Compare and contrast Ponyboy and Johnny in <em>The Outsiders</em>.</li><li>Include three similarities and three differences.</li><li>Use text evidence &amp; page numbers.</li></ul>' });
    if (req.method === 'GET' && u.pathname === '/api/v1/courses/123/pages/water-cycle') return send({ title: 'Water Cycle Lab', body: '<h2>Lab steps</h2><p>Explain the water cycle as a process. Show the 4 stages in order.</p>' });
    send({}, 404);
  });
  await new Promise(r => canvas.listen(0, r));
  Object.assign(process.env, { CANVAS_BASE_URL: `http://localhost:${canvas.address().port}`, CANVAS_CLIENT_ID: '1', CANVAS_CLIENT_SECRET: 's', SESSION_SECRET: 'y'.repeat(40) });
  const fns = {};
  // VERCEL=1 runs the same flow through the Vercel entry points in api/
  for (const n of ['auth-start', 'auth-callback', 'submit', 'docx', 'canvas-fetch']) {
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
    if (u.pathname === '/frame-test') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(`<iframe src="${u.searchParams.get('src')}" style="width:1000px;height:900px"></iframe>`); }
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
  await page.screenshot({ path: `${shots}/blank.png`, fullPage: true });
  const uploads = {};
  for (const f of ['argument-handout.docx', 'argument-handout.pdf', 'old.doc']) {
    await page.setInputFiles('#a-file', path.join(__dirname, 'fixtures', f));
    await page.waitForFunction(() => !/^Reading/.test(document.querySelector('#upload-note').textContent), null, { timeout: 15000 });
    uploads[f] = { note: await page.textContent('#upload-note'), title: await page.inputValue('#a-title'), pick: await page.textContent('.match[aria-pressed="true"] strong').catch(() => ''), checklist: await page.inputValue('#c-check') };
  }
  await page.screenshot({ path: `${shots}/upload.png`, fullPage: true });
  for (const link of ['https://cciubva.instructure.com/courses/123/assignments/789?module_item_id=5', 'https://cciubva.instructure.com/courses/123/pages/water-cycle']) {
    await page.fill('#a-link', link);
    await page.click('#link-btn');
    await page.waitForTimeout(500);
    await page.waitForFunction(() => /^Got|Canvas/.test(document.querySelector('#upload-note').textContent) && !/^Sign in|^Reading/.test(document.querySelector('#upload-note').textContent), null, { timeout: 15000 });
    uploads[link] = { note: await page.textContent('#upload-note'), title: await page.inputValue('#a-title'), pick: await page.textContent('.match[aria-pressed="true"] strong'), canvas: await page.textContent('#canvas-note'), criteria: await page.inputValue('#a-criteria') };
  }
  console.log(JSON.stringify(uploads, null, 1));
  await page.click('[data-sample="0"]'); await page.waitForTimeout(300);
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
  // same-tab sign-in: the page leaves for Canvas and comes back, then turns in
  await st.click('#turn-in');
  await st.waitForSelector('.status.ok', { timeout: 15000 }).catch(() => {});
  const urlAfter = st.url();
  const result = await st.textContent('#status');
  const [dl] = await Promise.all([st.waitForEvent('download'), st.click('#download')]);
  await st.screenshot({ path: `${shots}/student.png`, fullPage: true });
  const phone = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
  const pp = await phone.newPage(); await pp.goto(link); await pp.waitForTimeout(600); await pp.click('.looks [data-look="space"]'); await pp.waitForTimeout(300);
  await pp.screenshot({ path: `${shots}/phone-dark.png`, fullPage: true });
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  // embedded in a frame (like a Canvas page): sign-in uses a small window instead
  const fr = await ctx.newPage();
  await fr.setContent(`<iframe src="${link}" style="width:1000px;height:900px"></iframe>`);
  await fr.goto(`${base}frame-test?src=${encodeURIComponent(link)}`);
  const frame = fr.frames()[1]; await frame.waitForSelector('#turn-in');
  const [fpop] = await Promise.all([fr.waitForEvent('popup'), frame.click('#turn-in')]);
  await frame.waitForSelector('.status.ok', { timeout: 15000 }).catch(() => {});
  const framedResult = await frame.textContent('#status');
  console.log(JSON.stringify({ urlAfter, framedResult }, null, 1));
  console.log(JSON.stringify({ note, linkLen: link.length, kept, result, download: dl.suggestedFilename(), overflow, errors, calls }, null, 1));
  await browser.close(); site.close(); canvas.close();
})();
