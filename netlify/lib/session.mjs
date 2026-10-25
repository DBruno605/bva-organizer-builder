// Signed OAuth state and an encrypted, short-lived token blob.
// The student's Canvas token never reaches page JavaScript in readable form.
import crypto from 'node:crypto';

function key(purpose) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be set (32+ characters).');
  return crypto.createHash('sha256').update(purpose + ':' + secret).digest();
}

const b64u = buf => Buffer.from(buf).toString('base64url');

export function signState(data) {
  const body = b64u(JSON.stringify({ ...data, t: Date.now(), n: crypto.randomBytes(8).toString('hex') }));
  const sig = b64u(crypto.createHmac('sha256', key('state')).update(body).digest());
  return body + '.' + sig;
}

export function verifyState(state, maxAgeMs = 10 * 60 * 1000) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) return null;
  const want = b64u(crypto.createHmac('sha256', key('state')).update(body).digest());
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  return Date.now() - data.t < maxAgeMs ? data : null;
}

export function seal(obj, ttlMs = 30 * 60 * 1000) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key('seal'), iv);
  const enc = Buffer.concat([c.update(JSON.stringify({ ...obj, exp: Date.now() + ttlMs })), c.final()]);
  return b64u(Buffer.concat([iv, c.getAuthTag(), enc]));
}

export function unseal(blob) {
  try {
    const raw = Buffer.from(String(blob), 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', key('seal'), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const obj = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString());
    return obj.exp > Date.now() ? obj : null;
  } catch {
    return null;
  }
}
