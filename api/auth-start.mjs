// Vercel entry point. The work happens in the shared Netlify function.
import handler from '../netlify/functions/auth-start.mjs';

export function GET(request) {
  return handler(request);
}
