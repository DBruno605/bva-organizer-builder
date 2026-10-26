// Canvas sends the person back here. Swap the code for a token, seal it, and hand
// the sealed blob back: to the page in the same tab (#go-session=...) or to the
// page that opened the sign-in window.
import { BASE, CALLBACK_PATH, CLIENT_ID, CLIENT_SECRET } from '../lib/canvas.mjs';
import { verifyState, seal } from '../lib/session.mjs';

function page(origin, message) {
  const json = JSON.stringify(message).replace(/</g, '\\u003c');
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Signing in…</title>
<body style="font:16px system-ui;padding:24px">
<p id="m">${message.ok ? 'Signed in. You can close this window.' : 'Sign-in did not finish. Close this window and try again.'}</p>
<script>
  try { window.opener && window.opener.postMessage(${json}, ${JSON.stringify(origin)}); } catch (e) {}
  try { localStorage.setItem('go-auth', JSON.stringify(${json})); } catch (e) {}
  setTimeout(function () { window.close(); }, 400);
</script>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}

function back(state, message) {
  const hash = message.ok ? '#go-session=' + encodeURIComponent(message.session) : '#go-failed';
  return new Response(null, { status: 302, headers: { Location: state.r + hash, 'Cache-Control': 'no-store' } });
}

export default async (req) => {
  const url = new URL(req.url);
  const origin = url.origin;
  const state = verifyState(url.searchParams.get('state'));
  const reply = message => (state && state.r ? back(state, message) : page(origin, message));
  const code = url.searchParams.get('code');
  if (!code || !state) return reply({ type: 'go-auth', ok: false, error: url.searchParams.get('error') || 'expired' });
  const res = await fetch(`${BASE}/login/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: origin + CALLBACK_PATH,
      code,
    }),
  });
  if (!res.ok) return reply({ type: 'go-auth', ok: false, error: 'token' });
  const tok = await res.json();
  const session = seal({ token: tok.access_token, userId: tok.user && tok.user.id, name: tok.user && tok.user.name });
  return reply({ type: 'go-auth', ok: true, session, name: tok.user && tok.user.name });
};
