// Opens Canvas sign-in in the popup the page creates when a student clicks Turn in.
import { BASE, CALLBACK_PATH } from '../lib/canvas.mjs';
import { signState } from '../lib/session.mjs';

export default async (req) => {
  const origin = new URL(req.url).origin;
  const params = new URLSearchParams({
    client_id: process.env.CANVAS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: origin + CALLBACK_PATH,
    state: signState({}),
  });
  // Only needed when the developer key has "Enforce scopes" turned on.
  if (process.env.CANVAS_SCOPES) params.set('scope', process.env.CANVAS_SCOPES);
  return Response.redirect(`${BASE}/login/oauth2/auth?${params}`, 302);
};
