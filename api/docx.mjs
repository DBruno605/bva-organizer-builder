// Vercel entry point. The work happens in the shared Netlify function.
import handler from '../netlify/functions/docx.mjs';

export function POST(request) {
  return handler(request);
}
