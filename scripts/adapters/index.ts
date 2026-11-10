import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rawPlanSchema, type Provider, type RawPlan } from '../../src/lib/schema';
import { PARSERS, htmlToText, type Page } from './parsers';

export interface AdapterResult {
  provider: string;
  ok: boolean;
  plans: RawPlan[];
  error?: string;
}

const READER_PREFIX = 'https://r.jina.ai/';

async function fetchPage(provider: Provider): Promise<Page> {
  const source = provider.feedUrl ?? provider.pricingUrl;
  const url = provider.fetchMode === 'jina' ? `${READER_PREFIX}${source}` : source;
  const response = await fetch(url, {
    headers: {
      'user-agent': 'VMCompareBot/1.0 (+https://vm-compare.fixes.co.za)',
      accept:
        provider.fetchMode === 'jina'
          ? 'text/plain,text/markdown,*/*'
          : 'text/html,application/xhtml+xml,*/*',
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const body = await response.text();
  if (provider.feedUrl) {
    // Feeds are usually JSON; keep the raw body for the provider parser.
    return { html: body, text: body };
  }
  if (provider.fetchMode === 'jina') {
    return { html: body, text: body.replace(/\s+/g, ' ').trim() };
  }
  return { html: body, text: htmlToText(body) };
}

function manualPlans(provider: Provider): RawPlan[] {
  const seed = JSON.parse(readFileSync(join(process.cwd(), 'data', 'seed.json'), 'utf8')) as RawPlan[];
  return seed
    .filter((plan) => plan.provider === provider.slug)
    .map((plan) =>
      rawPlanSchema.parse({
        ...plan,
        status: 'archived',
        source: 'manual',
      }),
    );
}

export async function scrapeProvider(provider: Provider): Promise<AdapterResult> {
  try {
    if (provider.adapter === 'manual') {
      const plans = manualPlans(provider);
      return {
        provider: provider.slug,
        ok: plans.length > 0,
        plans,
        error: plans.length ? undefined : 'No manual plans found in data/seed.json',
      };
    }

    if (provider.adapter === 'playwright') {
      throw new Error('Playwright adapter is not configured yet');
    }

    const parser = PARSERS[provider.slug];
    if (!parser) throw new Error(`No parser registered for ${provider.slug}`);

    const page = await fetchPage(provider);
    const plans = parser(page, provider).map((raw) => rawPlanSchema.parse(raw));
    if (plans.length === 0) throw new Error('Parser returned zero plans; page structure may have changed');

    return { provider: provider.slug, ok: true, plans };
  } catch (error) {
    return {
      provider: provider.slug,
      ok: false,
      plans: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
