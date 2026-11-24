import { extractJson } from './util.mjs';

function endpoint(baseUrl) {
  return String(baseUrl || '').replace(/\/$/, '') + '/chat/completions';
}

async function chat(provider, messages, { temperature = 0 } = {}) {
  if (!provider?.baseUrl || !provider?.model) throw new Error('Provider baseUrl/model missing in config');
  if (!provider?.apiKey) throw new Error('Provider apiKey missing. Run `jevandroid configure`.');
  const res = await fetch(endpoint(provider.baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${provider.apiKey}` },
    body: JSON.stringify({ model: provider.model, temperature, messages })
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Model HTTP ${res.status}: ${body.slice(0, 500)}`);
  const json = JSON.parse(body);
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Model response has no choices[0].message.content');
  return content;
}

export async function chooseAction(provider, goal, observation, history = []) {
  const allowed = ['CLICK','TYPE_TEXT','SCROLL_UP','SCROLL_DOWN','BACK','HOME','WAIT','DONE','BLOCKED'];
  const system = `You are JevAndroid's constrained decision policy. Choose exactly ONE next Android UI action from the observed indexed elements. Never invent coordinates, selectors, shell commands, apps, or targets. Return JSON only: {"action":"...","target":number|null,"reason":"short"}. CLICK and TYPE_TEXT require a visible target index. Other actions use target=null. Use DONE only when the user's goal is visibly satisfied. Use BLOCKED only when the goal cannot safely proceed from the current UI.`;
  const recent = history.slice(-5).map(x => `${x.action}${x.target ? ` [${x.target}]` : ''}: ${x.result}`).join('\n');
  const user = `GOAL:\n${goal}\n\nCURRENT UI:\n${observation}\n\nRECENT ACTIONS:\n${recent || '(none)'}\n\nAllowed actions: ${allowed.join(', ')}`;
  const raw = await chat(provider, [{ role:'system', content:system }, { role:'user', content:user }]);
  const d = extractJson(raw);
  d.action = String(d.action || '').toUpperCase();
  if (!allowed.includes(d.action)) throw new Error(`Model returned unsupported action: ${d.action}`);
  if (['CLICK','TYPE_TEXT'].includes(d.action) && !Number.isInteger(Number(d.target))) throw new Error(`${d.action} requires target index`);
  return d;
}

export async function generateText(provider, goal, observation, target) {
  const system = `You write only the exact text JevAndroid should type into one Android field. Return JSON only: {"text":"..."}. Do not add commentary.`;
  const user = `GOAL:\n${goal}\n\nUI:\n${observation}\n\nTARGET FIELD:\n[${target.index}] ${target.role} ${target.text}`;
  const raw = await chat(provider, [{ role:'system', content:system }, { role:'user', content:user }]);
  const d = extractJson(raw);
  if (typeof d.text !== 'string') throw new Error('Text helper did not return {"text":"..."}');
  return d.text;
}
