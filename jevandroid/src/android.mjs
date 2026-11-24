import fs from 'node:fs/promises';
import path from 'node:path';
import { INSTALL_DIR } from './config.mjs';
import { sh, hash, parseBounds, xmlUnescape, clampText, escapeInputText, sleep } from './util.mjs';

const DUMP_FILE = path.join(INSTALL_DIR, 'tmp/window.xml');

function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[m[1]] = xmlUnescape(m[2]);
  return attrs;
}

function roleFor(a) {
  const cls = a.class || '';
  if (cls.includes('EditText')) return 'textbox';
  if (cls.includes('Button') || a.clickable === 'true') return 'button';
  if (cls.includes('CheckBox')) return 'checkbox';
  if (cls.includes('Switch')) return 'switch';
  if (cls.includes('RadioButton')) return 'radio';
  if (cls.includes('Spinner')) return 'select';
  if (cls.includes('Image')) return 'image';
  if (cls.includes('TextView')) return 'text';
  return 'node';
}

async function currentWindow() {
  try {
    const { stdout } = await sh('dumpsys', ['window', 'windows'], { timeout: 5000 });
    const line = stdout.split('\n').find(l => /mCurrentFocus|mFocusedApp/.test(l)) || '';
    const match = line.match(/([A-Za-z0-9._]+)\/([A-Za-z0-9._$]+)/);
    return match ? { package: match[1], activity: match[2] } : { package: '', activity: '' };
  } catch { return { package: '', activity: '' }; }
}

export async function observe(config = {}) {
  await fs.mkdir(path.dirname(DUMP_FILE), { recursive: true });
  try { await fs.unlink(DUMP_FILE); } catch {}
  await sh('uiautomator', ['dump', DUMP_FILE], { timeout: 10000 });
  const xml = await fs.readFile(DUMP_FILE, 'utf8');
  const win = await currentWindow();
  const includeText = config.includeNonInteractiveText !== false;
  const limit = Number(config.snapshotLimit || 80);
  const elements = [];

  for (const match of xml.matchAll(/<node\b[^>]*\/>/g)) {
    const a = parseAttrs(match[0]);
    const bounds = parseBounds(a.bounds);
    if (!bounds) continue;
    const text = clampText(a.text || a['content-desc'] || a['resource-id'] || '');
    const interactive = a.clickable === 'true' || a.focusable === 'true' || a.scrollable === 'true' ||
      /EditText|Button|CheckBox|Switch|RadioButton|Spinner/.test(a.class || '');
    if (!interactive && !(includeText && text)) continue;
    elements.push({
      index: elements.length + 1,
      role: roleFor(a),
      text,
      resourceId: a['resource-id'] || '',
      className: a.class || '',
      packageName: a.package || '',
      clickable: a.clickable === 'true',
      focusable: a.focusable === 'true',
      focused: a.focused === 'true',
      scrollable: a.scrollable === 'true',
      enabled: a.enabled !== 'false',
      bounds
    });
    if (elements.length >= limit) break;
  }

  const markerSource = JSON.stringify({
    package: win.package,
    activity: win.activity,
    nodes: elements.map(e => [e.role, e.text, e.resourceId, e.bounds.x1, e.bounds.y1, e.bounds.x2, e.bounds.y2])
  });
  return { ...win, marker: hash(markerSource), xmlHash: hash(xml), elements };
}

export function formatObservation(obs) {
  const lines = [`APP ${obs.package || 'unknown'} ${obs.activity || ''}`, `SNAPSHOT ${obs.marker}`];
  for (const e of obs.elements) {
    const flags = [e.focused ? 'focused' : '', e.scrollable ? 'scrollable' : '', !e.enabled ? 'disabled' : ''].filter(Boolean);
    lines.push(`[${e.index}] ${e.role.padEnd(8)} ${e.text || '(unnamed)'}${flags.length ? ` · ${flags.join(',')}` : ''}`);
  }
  return lines.join('\n');
}

export class StaleStateError extends Error {}

async function verifyFresh(previous) {
  const now = await observe({ snapshotLimit: Math.max(previous.elements.length, 80), includeNonInteractiveText: true });
  if (now.marker !== previous.marker) throw new StaleStateError(`UI changed (${previous.marker} -> ${now.marker})`);
  return now;
}

function targetFor(obs, index) {
  const n = Number(index);
  const target = obs.elements.find(e => e.index === n);
  if (!target) throw new Error(`Invalid target index: ${index}`);
  if (!target.enabled) throw new Error(`Target [${index}] is disabled`);
  return target;
}

export async function execute(obs, decision, textValue, config = {}) {
  const action = String(decision.action || '').toUpperCase();
  if (!['WAIT', 'DONE', 'BLOCKED'].includes(action)) await verifyFresh(obs);

  if (action === 'CLICK') {
    const t = targetFor(obs, decision.target);
    await sh('input', ['tap', String(t.bounds.cx), String(t.bounds.cy)]);
    return `clicked [${t.index}] ${t.text}`;
  }
  if (action === 'TYPE_TEXT') {
    const t = targetFor(obs, decision.target);
    await sh('input', ['tap', String(t.bounds.cx), String(t.bounds.cy)]);
    await sleep(80);
    await sh('input', ['text', escapeInputText(textValue ?? '')]);
    return `typed into [${t.index}] ${t.text}`;
  }
  if (action === 'SCROLL_DOWN' || action === 'SCROLL_UP') {
    const { stdout } = await sh('wm', ['size']);
    const m = stdout.match(/Physical size:\s*(\d+)x(\d+)/) || stdout.match(/(\d+)x(\d+)/);
    const w = m ? Number(m[1]) : 1080, h = m ? Number(m[2]) : 2400;
    const x = Math.floor(w * 0.5);
    const fromY = action === 'SCROLL_DOWN' ? Math.floor(h * 0.75) : Math.floor(h * 0.3);
    const toY = action === 'SCROLL_DOWN' ? Math.floor(h * 0.3) : Math.floor(h * 0.75);
    await sh('input', ['swipe', String(x), String(fromY), String(x), String(toY), '220']);
    return action.toLowerCase();
  }
  if (action === 'BACK') { await sh('input', ['keyevent', '4']); return 'back'; }
  if (action === 'HOME') { await sh('input', ['keyevent', '3']); return 'home'; }
  if (action === 'WAIT') { await sleep(Number(config.waitMs || 300)); return 'waited'; }
  if (action === 'DONE') return 'done';
  if (action === 'BLOCKED') return 'blocked';
  throw new Error(`Unsupported action: ${action}`);
}
