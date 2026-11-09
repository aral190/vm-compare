import {
  VAT_RATE,
  planSchema,
  rawPlanSchema,
  type Plan,
  type Provider,
  type RawPlan,
} from '../src/lib/schema';
import { slugify } from '../src/lib/slug';

export function toCents(rand: number): number {
  return Math.round((rand + Number.EPSILON) * 100);
}

/**
 * Normalise a raw advertised price into the canonical comparison plan.
 *
 * Providers that state VAT-inclusive prices keep their price. Providers that
 * state VAT-exclusive prices, and providers that do not state a treatment, are
 * grossed up by 15%. The as-listed price is always preserved.
 */
export function normalizePlan(raw: RawPlan, provider: Provider, lastChecked = today()): Plan {
  const parsed = rawPlanSchema.parse(raw);
  const providerVat = provider.vat;
  const vatIncluded = providerVat === 'incl';
  const vatAssumed = providerVat === 'unknown';
  const priceAsListedCents = toCents(parsed.price);
  const priceInclVatCents = vatIncluded
    ? priceAsListedCents
    : toCents(parsed.price * (1 + VAT_RATE));

  const features = Array.from(new Set([...provider.features, ...parsed.features])).sort();

  return planSchema.parse({
    id: parsed.id ?? `${provider.slug}-${slugify(parsed.plan)}`,
    provider: provider.slug,
    plan: parsed.plan,
    vcpu: parsed.vcpu,
    ramGb: parsed.ramGb,
    storageGb: parsed.storageGb,
    storageType: parsed.storageType,
    bandwidth: parsed.bandwidth,
    priceInclVatCents,
    priceAsListedCents,
    vatIncluded,
    vatAssumed,
    billingTerm: parsed.billingTerm,
    setupFeeCents: toCents(parsed.setupFee),
    ipv4: parsed.ipv4,
    location: parsed.location ?? (provider.locations.join(' / ') || 'South Africa'),
    features,
    url: parsed.url ?? provider.pricingUrl,
    lastChecked,
    status: parsed.status,
    source: parsed.source,
    notes: parsed.notes,
  });
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isVatInclusive(provider: Provider): boolean {
  return provider.vat === 'incl';
}
