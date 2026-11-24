import fs from 'node:fs';
import path from 'node:path';

export const INSTALL_DIR = process.env.JEVANDROID_HOME || '/data/adb/jevandroid';
export const CONFIG_PATH = process.env.JEVANDROID_CONFIG || path.join(INSTALL_DIR, 'config/config.json');

export function loadConfig() {
  let data;
  try { data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (err) { throw new Error(`Cannot read config ${CONFIG_PATH}: ${err.message}`); }
  data.provider ||= {};
  data.agent ||= {};
  data.provider.baseUrl = process.env.JEV_BASE_URL || data.provider.baseUrl;
  data.provider.apiKey = process.env.JEV_API_KEY || data.provider.apiKey;
  data.provider.model = process.env.JEV_MODEL || data.provider.model;
  data.agent.maxSteps ??= 30;
  data.agent.waitMs ??= 300;
  data.agent.snapshotLimit ??= 80;
  data.agent.includeNonInteractiveText ??= true;
  return data;
}
