import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { planSchema, providerSchema, type Plan, type Provider } from '../src/lib/schema';
import { normalizePlan, today } from './normalize';
import { updateHistory } from './history';
import { scrapeProvider, type AdapterResult } from './adapters';

const root = process.cwd();
const dataDir = join(root, 'data');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function mergeProvider(existing: Plan[], incoming: Plan[], date: string): Plan[] {
  const incomingIds = new Set(incoming.map((plan) => plan.id));
  const merged = [...incoming];

  for (const old of existing) {
    if (incomingIds.has(old.id)) continue;
    if (old.status === 'archived') {
      merged.push(old);
    } else {
      merged.push({
        ...old,
        status: 'stale',
        notes: old.notes || `No longer listed on the provider pricing page as of ${date}.`,
      });
    }
  }

  return merged;
}

function markFailed(existing: Plan[], date: string, error: string | undefined): Plan[] {
  return existing.map((plan) =>
    plan.status === 'archived'
      ? plan
      : {
          ...plan,
          status: 'stale',
          notes: plan.notes || `Scheduled check failed on ${date}: ${error ?? 'unknown error'}.`,
        },
  );
}

function sortPlans(plans: Plan[]): Plan[] {
  return plans.sort(
    (a, b) =>
      a.provider.localeCompare(b.provider) ||
      a.ramGb - b.ramGb ||
      a.priceInclVatCents - b.priceInclVatCents,
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const providerArg = args.find((arg) => arg.startsWith('--provider='))?.split('=')[1];

  const providers = providerSchema.array().parse(readJson(join(dataDir, 'providers.json')));
  const existing = planSchema.array().parse(readJson(join(dataDir, 'plans.json')));
  const targets: Provider[] = providerArg
    ? providers.filter((provider) => provider.slug === providerArg)
    : providers;

  if (targets.length === 0) {
    console.error(`No provider matched ${providerArg ?? '(none)'}`);
    process.exit(1);
  }

  const date = today();
  const byProvider = new Map<string, Plan[]>();
  for (const plan of existing) {
    const list = byProvider.get(plan.provider) ?? [];
    list.push(plan);
    byProvider.set(plan.provider, list);
  }

  const results: AdapterResult[] = [];

  for (const provider of targets) {
    process.stdout.write(`→ ${provider.name} … `);
    const result = await scrapeProvider(provider);
    results.push(result);

    if (result.ok) {
      const normalized = result.plans.map((raw) => normalizePlan(raw, provider, date));
      byProvider.set(provider.slug, mergeProvider(byProvider.get(provider.slug) ?? [], normalized, date));
      process.stdout.write(`ok (${result.plans.length} plans)\n`);
    } else {
      process.stdout.write(`failed: ${result.error}\n`);
      const current = byProvider.get(provider.slug) ?? [];
      byProvider.set(provider.slug, markFailed(current, date, result.error));
    }

    if (!dryRun && targets.indexOf(provider) < targets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  const succeeded = results.filter((result) => result.ok).length;
  const attempted = results.length;

  if (dryRun) {
    console.log('\nDry run — no files written.');
    for (const result of results) {
      if (!result.ok) continue;
      console.log(`\n${result.provider}`);
      for (const plan of result.plans) {
        console.log(
          `  ${plan.plan}: ${plan.vcpu} vCPU, ${plan.ramGb} GB RAM, ${plan.storageGb} GB ${plan.storageType}, R${plan.price}`,
        );
      }
    }
    if (succeeded === 0) process.exitCode = 1;
    return;
  }

  if (succeeded === 0) {
    console.error('\nAll providers failed. Keeping the existing data untouched.');
    process.exitCode = 1;
    return;
  }

  const plans = sortPlans([...byProvider.values()].flat());
  writeJson(join(dataDir, 'plans.json'), plans);

  for (const result of results) {
    if (!result.ok) continue;
    const providerPlans = byProvider.get(result.provider) ?? [];
    if (providerPlans.some((plan) => plan.status !== 'archived')) {
      updateHistory(result.provider, providerPlans, date);
    }
  }

  const snapshotsDir = join(dataDir, 'snapshots');
  mkdirSync(snapshotsDir, { recursive: true });
  const snapshotPath = join(snapshotsDir, `${date}.json`);
  const snapshot = existsSync(snapshotPath)
    ? (readJson(snapshotPath) as { date: string; results: Record<string, unknown> })
    : { date, results: {} as Record<string, unknown> };

  for (const result of results) {
    snapshot.results[result.provider] = {
      ok: result.ok,
      count: result.plans.length,
      error: result.error ?? null,
      plans: result.plans,
    };
  }
  writeJson(snapshotPath, snapshot);

  console.log(`\n${succeeded}/${attempted} providers scraped for ${date}`);
  console.log(`Wrote ${plans.length} plans and updated history.`);
}

main();
