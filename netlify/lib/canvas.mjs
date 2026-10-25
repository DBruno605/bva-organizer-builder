// Canvas calls made with the student's own token.
export const BASE = (process.env.CANVAS_BASE_URL || 'https://cciubva.instructure.com').replace(/\/$/, '');

async function api(token, path, init = {}) {
  const res = await fetch(path.startsWith('http') ? path : BASE + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + token, ...(init.headers || {}) },
    redirect: init.redirect || 'follow',
  });
  if (!res.ok && res.status !== 201 && !(res.status >= 300 && res.status < 400)) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Canvas ${init.method || 'GET'} ${path.split('?')[0]} failed (${res.status}): ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

// Canvas file upload, then an online_upload submission.
// https://canvas.instructure.com/doc/api/file.file_uploads.html
export async function submitFile(token, { courseId, assignmentId, fileName, bytes, comment }) {
  const ctype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const base = `/api/v1/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions`;

  // 1. Tell Canvas about the file
  const pre = await (await api(token, `${base}/self/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName, size: bytes.length, content_type: ctype }),
  })).json();

  // 2. Upload the bytes (upload_params first, file last; no auth header)
  const form = new FormData();
  for (const [k, v] of Object.entries(pre.upload_params || {})) form.append(k, v);
  form.append('file', new Blob([bytes], { type: ctype }), fileName);
  const up = await fetch(pre.upload_url, { method: 'POST', body: form, redirect: 'manual' });
  let file;
  if (up.status >= 300 && up.status < 400) {
    file = await (await api(token, up.headers.get('location'), { method: 'GET' })).json();
  } else if (up.ok) {
    file = await up.json();
    if (file.location && !file.id) file = await (await api(token, file.location)).json();
  } else {
    throw new Error(`File upload failed (${up.status}): ${(await up.text()).slice(0, 300)}`);
  }

  // 3. Submit it
  const sub = await (await api(token, base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission: { submission_type: 'online_upload', file_ids: [file.id] },
      ...(comment ? { comment: { text_comment: comment } } : {}),
    }),
  })).json();
  return { fileId: file.id, submission: sub };
}

export async function profile(token) {
  return (await api(token, '/api/v1/users/self/profile')).json();
}

export async function revoke(token) {
  try { await api(token, '/login/oauth2/token', { method: 'DELETE' }); } catch { /* already gone */ }
}
