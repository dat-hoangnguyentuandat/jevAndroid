#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig, CONFIG_PATH, INSTALL_DIR } from './config.mjs';
import { observe, formatObservation } from './android.mjs';
import { Agent } from './agent.mjs';

const [cmd = 'help', ...args] = process.argv.slice(2);

function help() {
  console.log(`JevAndroid v0.1.0-dev\n\nCommands:\n  jevandroid doctor\n  jevandroid configure\n  jevandroid snapshot\n  jevandroid run "<goal>"\n  jevandroid config\n`);
}

async function doctor() {
  console.log('JevAndroid doctor');
  console.log(`install: ${INSTALL_DIR}`);
  console.log(`node: ${process.execPath}`);
  console.log(`node version: ${process.version}`);
  for (const c of ['uiautomator','input','dumpsys','wm']) {
    const ok = await import('node:child_process').then(({spawnSync}) => spawnSync('sh',['-c',`command -v ${c}`],{encoding:'utf8'}).status === 0);
    console.log(`${c}: ${ok ? 'OK' : 'MISSING'}`);
  }
  try { const cfg=loadConfig(); console.log(`provider: ${cfg.provider.baseUrl} · ${cfg.provider.model} · key=${cfg.provider.apiKey ? 'set':'missing'}`); }
  catch(e){ console.log(`config: ERROR ${e.message}`); }
}

async function configure() {
  const rl = readline.createInterface({ input, output });
  let cfg;
  try { cfg = loadConfig(); } catch { cfg = { provider:{}, agent:{} }; }
  const baseUrl = await rl.question(`OpenAI-compatible base URL [${cfg.provider.baseUrl || 'https://api.openai.com/v1'}]: `) || cfg.provider.baseUrl || 'https://api.openai.com/v1';
  const model = await rl.question(`Model [${cfg.provider.model || ''}]: `) || cfg.provider.model;
  const apiKey = await rl.question(`API key [${cfg.provider.apiKey ? 'keep existing':'required'}]: `) || cfg.provider.apiKey;
  rl.close();
  cfg.provider = { baseUrl, model, apiKey };
  cfg.agent ||= { maxSteps:30, waitMs:300, snapshotLimit:80, includeNonInteractiveText:true };
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive:true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg,null,2) + '\n', { mode:0o600 });
  console.log(`Saved ${CONFIG_PATH}`);
}

if (cmd === 'help' || cmd === '--help' || cmd === '-h') help();
else if (cmd === 'doctor') await doctor();
else if (cmd === 'configure') await configure();
else if (cmd === 'snapshot') console.log(formatObservation(await observe(loadConfig().agent)));
else if (cmd === 'config') console.log(fs.readFileSync(CONFIG_PATH,'utf8'));
else if (cmd === 'run') {
  const goal = args.join(' ').trim();
  if (!goal) throw new Error('Usage: jevandroid run "<goal>"');
  const result = await new Agent(goal, loadConfig()).run();
  console.log(`\nresult: ${JSON.stringify(result, null, 2)}`);
  process.exitCode = result.status === 'done' ? 0 : 2;
} else { help(); process.exitCode = 1; }
