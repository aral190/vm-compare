import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  historySchema,
  planSchema,
  providerSchema,
  type HistoryEntry,
  type Plan,
  type Provider,
} from './schema';

const DATA_DIR = join(process.cwd(), 'data');

export interface PlanWithMetrics extends Plan {
  providerName: string;
  providerSlug: string;
  providerCategory: Provider['category'];
  pricePerGbRamCents: number;
  pricePerVcpuCents: number;
  pricePerStorageGbCents: number;
}

export interface TierWinner {
  tier: number;
  cheapest: PlanWithMetrics;
  bestValue: PlanWithMetrics;
  count: number;
}

export interface PriceChange {
  planId: string;
  provider: string;
  providerName: string;
  plan: string;
  ramGb: number;
  oldPriceCents: number;
  newPriceCents: number;
  changePercent: number;
  date: string;
}

export interface DataBundle {
  providers: Provider[];
  plans: PlanWithMetrics[];
  history: Map<string, HistoryEntry[]>;
  lastUpdated: string;
}

let cached: DataBundle | null = null;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function applyOverrides(plans: Plan[]): Plan[] {
  const path = `${DATA_DIR}/overrides.json`;
  if (!existsSync(path)) return plans;

  const overrides = readJson<Array<{ id: string; fields: Partial<Plan> }>>(path);
  if (!overrides.length) return plans;

  const byId = new Map(overrides.map((override) => [override.id, override.fields]));
  return plans.map((plan) => {
    const fields = byId.get(plan.id);
    return fields ? planSchema.parse({ ...plan, ...fields }) : plan;
  });
}

function loadHistory(): Map<string, HistoryEntry[]> {
  const dir = `${DATA_DIR}/history`;
  const map = new Map<string, HistoryEntry[]>();
  if (!existsSync(dir)) return map;

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const slug = file.replace(/\.json$/, '');
    map.set(slug, historySchema.parse(readJson(`${dir}/${file}`)));
  }
  return map;
}

export function loadData(): DataBundle {
  if (cached) return cached;

  const providers = providerSchema.array().parse(readJson(`${DATA_DIR}/providers.json`));
  const rawPlans = planSchema.array().parse(readJson(`${DATA_DIR}/plans.json`));
  const plans = applyOverrides(rawPlans);
  const providerBySlug = new Map(providers.map((provider) => [provider.slug, provider]));

  const withMetrics: PlanWithMetrics[] = plans
    .map((plan) => {
      const provider = providerBySlug.get(plan.provider);
      if (!provider) throw new Error(`Unknown provider: ${plan.provider}`);
      return {
        ...plan,
        providerName: provider.name,
        providerSlug: provider.slug,
        providerCategory: provider.category,
        pricePerGbRamCents: plan.priceInclVatCents / plan.ramGb,
        pricePerVcpuCents: plan.priceInclVatCents / plan.vcpu,
        pricePerStorageGbCents: plan.priceInclVatCents / plan.storageGb,
      };
    })
    .sort(
      (a, b) =>
        a.priceInclVatCents - b.priceInclVatCents ||
        b.ramGb - a.ramGb ||
        a.providerName.localeCompare(b.providerName),
    );

  const lastUpdated = withMetrics.reduce(
    (latest, plan) => (plan.lastChecked > latest ? plan.lastChecked : latest),
    '',
  );

  cached = {
    providers,
    plans: withMetrics,
    history: loadHistory(),
    lastUpdated,
  };
  return cached;
}

export function getProviders(): Provider[] {
  return loadData().providers;
}

export function getProvider(slug: string): Provider | undefined {
  return getProviders().find((provider) => provider.slug === slug);
}

export function getPlans(): PlanWithMetrics[] {
  return loadData().plans;
}

export function getLivePlans(): PlanWithMetrics[] {
  return getPlans().filter((plan) => plan.status !== 'archived');
}

export function getLastUpdated(): string {
  return loadData().lastUpdated;
}

export function getTierWinners(tiers: number[]): TierWinner[] {
  const plans = getLivePlans();
  return tiers
    .map((tier) => {
      const candidates = plans.filter((plan) => plan.ramGb >= tier);
      if (!candidates.length) return null;

      const cheapest = candidates.reduce((best, plan) =>
        plan.priceInclVatCents < best.priceInclVatCents ? plan : best,
      );
      // Compare price per GB within the size class, otherwise the largest plan
      // always wins and the number stops being useful.
      const band = candidates.filter((plan) => plan.ramGb < tier * 2);
      const bestValuePool = band.length ? band : candidates;
      const bestValue = bestValuePool.reduce((best, plan) =>
        plan.pricePerGbRamCents < best.pricePerGbRamCents ? plan : best,
      );

      return { tier, cheapest, bestValue, count: band.length || candidates.length };
    })
    .filter((winner): winner is TierWinner => winner !== null);
}

export function getPlansByProvider(): Map<string, PlanWithMetrics[]> {
  const map = new Map<string, PlanWithMetrics[]>();
  for (const plan of getPlans()) {
    const list = map.get(plan.provider) ?? [];
    list.push(plan);
    map.set(plan.provider, list);
  }
  return map;
}

export function getHistory(slug: string): HistoryEntry[] {
  return loadData().history.get(slug) ?? [];
}

export function getPriceChanges(): PriceChange[] {
  const { history, plans } = loadData();
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const changes: PriceChange[] = [];

  for (const [provider, entries] of history) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const previous = sorted[sorted.length - 2];
    const latest = sorted[sorted.length - 1];
    const previousById = new Map(previous.plans.map((plan) => [plan.id, plan]));

    for (const plan of latest.plans) {
      const old = previousById.get(plan.id);
      if (!old || old.priceInclVatCents === plan.priceInclVatCents) continue;
      const meta = planById.get(plan.id);
      if (!meta) continue;
      changes.push({
        planId: plan.id,
        provider,
        providerName: meta.providerName,
        plan: meta.plan,
        ramGb: plan.ramGb,
        oldPriceCents: old.priceInclVatCents,
        newPriceCents: plan.priceInclVatCents,
        changePercent: ((plan.priceInclVatCents - old.priceInclVatCents) / old.priceInclVatCents) * 100,
        date: latest.date,
      });
    }
  }

  return changes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}
