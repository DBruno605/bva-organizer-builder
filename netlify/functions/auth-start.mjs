// Starts Canvas sign-in. With ?return=<page> the same tab comes back to that page afterward;
// without it (page embedded in a frame) this runs in a small sign-in window.
import { BASE, CALLBACK_PATH, CLIENT_ID } from '../lib/canvas.mjs';
import { signState } from '../lib/session.mjs';

// Only pages on this same site may be returned to.
function returnTo(req, origin) {
  try {
    const r = new URL(new URL(req.url).searchParams.get('return') || '');
    return r.origin === origin ? { r: r.origin + r.pathname + r.search } : {};
  } catch {
    return {};
  }
}

export default async (req) => {
  const origin = new URL(req.url).origin;
  if (!/^\d+$/.test(CLIENT_ID)) {
    return new Response('<!doctype html><meta charset="utf-8"><p style="font:16px system-ui;padding:24px">This site is missing its Canvas Client ID (CANVAS_CLIENT_ID should be a long number). Ask your teacher to check the site settings.</p>', { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: origin + CALLBACK_PATH,
    state: signState(returnTo(req, origin)),
  });
  // Only needed when the developer key has "Enforce scopes" turned on.
  if (process.env.CANVAS_SCOPES) params.set('scope', process.env.CANVAS_SCOPES);
  return Response.redirect(`${BASE}/login/oauth2/auth?${params}`, 302);
};
