import { observe, formatObservation, execute, StaleStateError } from './android.mjs';
import { chooseAction, generateText } from './model.mjs';
import { sleep } from './util.mjs';

export class Agent {
  constructor(goal, config, logger = console) {
    if (!goal?.trim()) throw new Error('Goal is required');
    this.goal = goal.trim();
    this.config = config;
    this.logger = logger;
    this.history = [];
  }

  async run() {
    const maxSteps = Number(this.config.agent.maxSteps || 30);
    for (let step = 1; step <= maxSteps; step++) {
      const obs = await observe(this.config.agent);
      const formatted = formatObservation(obs);
      this.logger.log(`\n--- step ${step}/${maxSteps} · ${obs.package || 'unknown'} · ${obs.marker} ---`);
      this.logger.log(formatted);

      const decision = await chooseAction(this.config.provider, this.goal, formatted, this.history);
      this.logger.log(`decision: ${decision.action}${decision.target ? ` [${decision.target}]` : ''} · ${decision.reason || ''}`);

      let textValue = null;
      if (decision.action === 'TYPE_TEXT') {
        const target = obs.elements.find(e => e.index === Number(decision.target));
        if (!target) throw new Error(`TYPE_TEXT target not found: ${decision.target}`);
        textValue = await generateText(this.config.provider, this.goal, formatted, target);
        this.logger.log(`text-helper: ${JSON.stringify(textValue)}`);
      }

      try {
        const result = await execute(obs, decision, textValue, this.config.agent);
        this.history.push({ step, action: decision.action, target: decision.target ?? null, result });
        if (decision.action === 'DONE') return { status:'done', steps:step, history:this.history };
        if (decision.action === 'BLOCKED') return { status:'blocked', steps:step, history:this.history };
      } catch (err) {
        if (err instanceof StaleStateError) {
          this.logger.log(`stale: ${err.message}; re-observing without consuming task state`);
          this.history.push({ step, action:'STALE_RETRY', target:null, result:err.message });
          await sleep(50);
          continue;
        }
        throw err;
      }
      await sleep(Number(this.config.agent.waitMs || 300));
    }
    return { status:'max_steps', steps:maxSteps, history:this.history };
  }
}
