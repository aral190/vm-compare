import { z } from 'zod';

export const VAT_RATE = 0.15;

export const providerSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  website: z.url(),
  pricingUrl: z.url(),
  category: z.enum(['sa', 'international']),
  locations: z.array(z.string()).default([]),
  vat: z.enum(['incl', 'excl', 'unknown']),
  adapter: z.enum(['html', 'playwright', 'manual']),
  fetchMode: z.enum(['direct', 'jina']).default('direct'),
  features: z.array(z.string()).default([]),
  reputation: z.string().default(''),
  affiliateUrl: z.url().nullable().default(null),
  notes: z.string().default(''),
});

export const rawPlanSchema = z.object({
  id: z.string().optional(),
  provider: z.string().min(1),
  plan: z.string().min(1),
  vcpu: z.number().positive(),
  ramGb: z.number().positive(),
  storageGb: z.number().positive(),
  storageType: z.enum(['nvme', 'ssd', 'hdd', 'unknown']).default('unknown'),
  bandwidth: z.string().default('Unspecified'),
  /** Price exactly as advertised, in rand. */
  price: z.number().positive(),
  billingTerm: z.enum(['monthly', 'annual']).default('monthly'),
  setupFee: z.number().min(0).default(0),
  ipv4: z.number().int().min(0).default(1),
  location: z.string().optional(),
  url: z.url().optional(),
  features: z.array(z.string()).default([]),
  status: z.enum(['current', 'stale', 'archived']).default('current'),
  notes: z.string().default(''),
  source: z.enum(['seed', 'scrape', 'manual']).default('seed'),
});

export const planSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  plan: z.string().min(1),
  vcpu: z.number().positive(),
  ramGb: z.number().positive(),
  storageGb: z.number().positive(),
  storageType: z.enum(['nvme', 'ssd', 'hdd', 'unknown']),
  bandwidth: z.string().default('Unspecified'),
  /** Canonical comparison price: rand cents, VAT inclusive. */
  priceInclVatCents: z.number().int().positive(),
  /** Price as advertised: rand cents, before VAT normalisation. */
  priceAsListedCents: z.number().int().positive(),
  vatIncluded: z.boolean(),
  /** True when the provider does not state VAT treatment and we assumed it. */
  vatAssumed: z.boolean().default(false),
  billingTerm: z.enum(['monthly', 'annual']).default('monthly'),
  setupFeeCents: z.number().int().min(0).default(0),
  ipv4: z.number().int().min(0).default(1),
  location: z.string().default('South Africa'),
  features: z.array(z.string()).default([]),
  url: z.url(),
  lastChecked: z.string().min(1),
  status: z.enum(['current', 'stale', 'archived']).default('current'),
  source: z.enum(['seed', 'scrape', 'manual']).default('seed'),
  notes: z.string().default(''),
});

export const historyEntrySchema = z.object({
  date: z.string().min(1),
  plans: z.array(
    z.object({
      id: z.string(),
      priceInclVatCents: z.number().int().nonnegative(),
      vcpu: z.number(),
      ramGb: z.number(),
      storageGb: z.number(),
    }),
  ),
});

export const historySchema = z.array(historyEntrySchema);

export type Provider = z.infer<typeof providerSchema>;
export type RawPlan = z.infer<typeof rawPlanSchema>;
export type Plan = z.infer<typeof planSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
