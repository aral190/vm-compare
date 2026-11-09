import { describe, expect, it } from 'vitest';
import { normalizePlan } from './normalize';
import type { Provider, RawPlan } from '../src/lib/schema';

const provider = (vat: Provider['vat']): Provider => ({
  slug: 'example',
  name: 'Example Host',
  website: 'https://example.co.za',
  pricingUrl: 'https://example.co.za/pricing',
  category: 'sa',
  locations: ['Johannesburg'],
  vat,
  adapter: 'html',
  fetchMode: 'direct',
  features: ['nvme'],
  reputation: '',
  affiliateUrl: null,
  notes: '',
});

const raw: RawPlan = {
  provider: 'example',
  plan: 'Example 4GB',
  vcpu: 2,
  ramGb: 4,
  storageGb: 80,
  storageType: 'nvme',
  bandwidth: 'Unlimited',
  price: 199,
  billingTerm: 'monthly',
  setupFee: 0,
  ipv4: 1,
  features: [],
  status: 'current',
  notes: '',
  source: 'seed',
};

describe('normalizePlan', () => {
  it('grosses up VAT-exclusive prices', () => {
    const plan = normalizePlan(raw, provider('excl'), '2026-11-09');
    expect(plan.priceAsListedCents).toBe(19900);
    expect(plan.priceInclVatCents).toBe(22885);
    expect(plan.vatIncluded).toBe(false);
    expect(plan.vatAssumed).toBe(false);
  });

  it('keeps VAT-inclusive prices unchanged', () => {
    const plan = normalizePlan(raw, provider('incl'), '2026-11-09');
    expect(plan.priceInclVatCents).toBe(19900);
    expect(plan.vatIncluded).toBe(true);
    expect(plan.vatAssumed).toBe(false);
  });

  it('assumes VAT-exclusive when the provider does not say', () => {
    const plan = normalizePlan(raw, provider('unknown'), '2026-11-09');
    expect(plan.priceInclVatCents).toBe(22885);
    expect(plan.vatIncluded).toBe(false);
    expect(plan.vatAssumed).toBe(true);
  });

  it('merges provider and plan features', () => {
    const plan = normalizePlan({ ...raw, features: ['backups'] }, provider('incl'), '2026-11-09');
    expect(plan.features).toEqual(['backups', 'nvme']);
  });
});
