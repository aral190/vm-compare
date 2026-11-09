import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { historySchema, type HistoryEntry, type Plan } from '../src/lib/schema';

const historyDir = join(process.cwd(), 'data', 'history');

export function updateHistory(provider: string, plans: Plan[], date: string): void {
  mkdirSync(historyDir, { recursive: true });
  const path = join(historyDir, `${provider}.json`);
  let history: HistoryEntry[] = [];

  if (existsSync(path)) {
    history = historySchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  }

  const entry: HistoryEntry = {
    date,
    plans: plans
      .filter((plan) => plan.status !== 'archived')
      .map((plan) => ({
        id: plan.id,
        priceInclVatCents: plan.priceInclVatCents,
        vcpu: plan.vcpu,
        ramGb: plan.ramGb,
        storageGb: plan.storageGb,
      })),
  };

  const index = history.findIndex((row) => row.date === date);
  if (index >= 0) history[index] = entry;
  else history.push(entry);

  history.sort((a, b) => a.date.localeCompare(b.date));
  writeFileSync(path, `${JSON.stringify(history, null, 2)}\n`);
}
