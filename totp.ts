const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTOTPSecret(len = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes).map(b => B32[b & 31]).join('');
}

function b32Decode(s: string): Uint8Array {
  const clean = s.toUpperCase().replace(/=+$/, '');
  const out: number[] = [];
  let buf = 0, bits = 0;
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    buf = (buf << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((buf >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(out);
}

async function hotp(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', b32Decode(secret),
    { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(counter / 0x100000000) >>> 0, false);
  view.setUint32(4, counter >>> 0, false);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
  const offset = sig[19] & 0xf;
  const code = (
    ((sig[offset] & 0x7f) << 24) | (sig[offset + 1] << 16) |
    (sig[offset + 2] << 8) | sig[offset + 3]
  ) % 1_000_000;
  return code.toString().padStart(6, '0');
}

export async function getTOTP(secret: string): Promise<string> {
  return hotp(secret, Math.floor(Date.now() / 30_000));
}

export async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  const t = Math.floor(Date.now() / 30_000);
  for (const delta of [-1, 0, 1]) {
    if ((await hotp(secret, t + delta)) === token) return true;
  }
  return false;
}

export function getOtpAuthURI(secret: string, email: string): string {
  return `otpauth://totp/CEO%20Exchange:${encodeURIComponent(email)}?secret=${secret}&issuer=CEO%20Exchange&algorithm=SHA1&digits=6&period=30`;
}
