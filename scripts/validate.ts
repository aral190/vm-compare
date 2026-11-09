import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { historySchema, planSchema, providerSchema } from '../src/lib/schema';

const root = process.cwd();
const dataDir = join(root, 'data');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function main(): void {
  const providersPath = join(dataDir, 'providers.json');
  const plansPath = join(dataDir, 'plans.json');

  if (!existsSync(providersPath)) fail(`Missing ${providersPath}`);
  if (!existsSync(plansPath)) fail(`Missing ${plansPath}`);

  const providers = providerSchema.array().parse(readJson(providersPath));
  const plans = planSchema.array().parse(readJson(plansPath));

  const providerSlugs = new Set<string>();
  for (const provider of providers) {
    if (providerSlugs.has(provider.slug)) fail(`Duplicate provider slug: ${provider.slug}`);
    providerSlugs.add(provider.slug);
  }

  const planIds = new Set<string>();
  const counts = { current: 0, stale: 0, archived: 0 };
  let vatAssumed = 0;

  for (const plan of plans) {
    if (!providerSlugs.has(plan.provider)) {
      fail(`Plan ${plan.id} references unknown provider ${plan.provider}`);
    }
    if (planIds.has(plan.id)) fail(`Duplicate plan id: ${plan.id}`);
    planIds.add(plan.id);
    counts[plan.status] += 1;

    if (plan.vatAssumed) vatAssumed += 1;

    if (!plan.vatIncluded && plan.priceInclVatCents <= plan.priceAsListedCents) {
      fail(`Plan ${plan.id} is marked VAT-exclusive but the inclusive price is not higher`);
    }
    if (plan.vatIncluded && plan.priceInclVatCents !== plan.priceAsListedCents) {
      fail(`Plan ${plan.id} is marked VAT-inclusive but the prices differ`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.lastChecked)) {
      fail(`Plan ${plan.id} has an invalid lastChecked date: ${plan.lastChecked}`);
    }
  }

  const historyDir = join(dataDir, 'history');
  if (existsSync(historyDir)) {
    for (const file of readdirSync(historyDir)) {
      if (!file.endsWith('.json')) continue;
      const slug = file.replace(/\.json$/, '');
      if (!providerSlugs.has(slug)) fail(`History file for unknown provider: ${file}`);
      historySchema.parse(readJson(join(historyDir, file)));
    }
  }

  console.log(`✔ ${providers.length} providers, ${plans.length} plans`);
  console.log(`  current: ${counts.current}, stale: ${counts.stale}, archived: ${counts.archived}`);
  if (vatAssumed > 0) {
    console.log(`  ${vatAssumed} plan(s) have an assumed VAT treatment (provider does not state it)`);
  }
}

main();
