// Returns the .docx for "Download my copy" without turning anything in.
import { buildDocx, fileName } from '../lib/build-docx.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Use POST.', { status: 405 });
  const { cfg, answers } = await req.json();
  if (!cfg || !Array.isArray(cfg.sections)) return new Response('Bad request.', { status: 400 });
  const bytes = await buildDocx(cfg, answers);
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName(cfg, answers && answers.name)}"`,
    },
  });
};
