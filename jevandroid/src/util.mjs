import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';

const execFileAsync = promisify(execFile);

export async function sh(command, args = [], options = {}) {
  const { stdout = '', stderr = '' } = await execFileAsync(command, args, {
    maxBuffer: 8 * 1024 * 1024,
    timeout: options.timeout ?? 10000,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) }
  });
  return { stdout, stderr };
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function clampText(s, n = 120) {
  const clean = String(s ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n - 1) + '…' : clean;
}

export function parseBounds(bounds) {
  const m = String(bounds || '').match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/);
  if (!m) return null;
  const [x1, y1, x2, y2] = m.slice(1).map(Number);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x1, y1, x2, y2, cx: Math.floor((x1 + x2) / 2), cy: Math.floor((y1 + y2) / 2) };
}

export function xmlUnescape(s = '') {
  return s
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

export function escapeInputText(text) {
  // Android `input text` uses %s for spaces. Shell is bypassed because execFile is used.
  return String(text)
    .replaceAll('%', '%25')
    .replaceAll(' ', '%s')
    .replaceAll('&', '\\&')
    .replaceAll('<', '\\<')
    .replaceAll('>', '\\>');
}

export function extractJson(text) {
  const raw = String(text || '').trim();
  try { return JSON.parse(raw); } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1));
  throw new Error('Model did not return valid JSON');
}
