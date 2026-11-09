import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  historySchema,
  providerSchema,
  rawPlanSchema,
  type HistoryEntry,
  type Plan,
} from '../src/lib/schema';
import { normalizePlan, today } from './normalize';

const root = process.cwd();
const dataDir = join(root, 'data');
const historyDir = join(dataDir, 'history');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function main(): void {
  const providers = providerSchema.array().parse(readJson(join(dataDir, 'providers.json')));
  const rawPlans = rawPlanSchema.array().parse(readJson(join(dataDir, 'seed.json')));
  const bySlug = new Map(providers.map((provider) => [provider.slug, provider]));
  const date = today();

  const plans: Plan[] = rawPlans
    .map((raw) => {
      const provider = bySlug.get(raw.provider);
      if (!provider) throw new Error(`Unknown provider in seed: ${raw.provider}`);
      return normalizePlan(raw, provider, date);
    })
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.ramGb - b.ramGb || a.priceInclVatCents - b.priceInclVatCents);

  writeJson(join(dataDir, 'plans.json'), plans);
  mkdirSync(historyDir, { recursive: true });

  const grouped = new Map<string, Plan[]>();
  for (const plan of plans) {
    const list = grouped.get(plan.provider) ?? [];
    list.push(plan);
    grouped.set(plan.provider, list);
  }

  for (const [provider, providerPlans] of grouped) {
    const path = join(historyDir, `${provider}.json`);
    let history: HistoryEntry[] = [];
    if (existsSync(path)) {
      history = historySchema.parse(readJson(path));
    }

    const entry: HistoryEntry = {
      date,
      plans: providerPlans.map((plan) => ({
        id: plan.id,
        priceInclVatCents: plan.priceInclVatCents,
        vcpu: plan.vcpu,
        ramGb: plan.ramGb,
        storageGb: plan.storageGb,
      })),
    };

    const existingIndex = history.findIndex((row) => row.date === date);
    if (existingIndex >= 0) history[existingIndex] = entry;
    else history.push(entry);

    history.sort((a, b) => a.date.localeCompare(b.date));
    writeJson(path, history);
  }

  console.log(`✔ Seeded ${plans.length} plans across ${grouped.size} providers for ${date}`);
}

main();
