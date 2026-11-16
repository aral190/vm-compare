/**
 * International VPS comparison data.
 *
 * Kept separate from the South African rand-denominated dataset in `data/`:
 * these providers bill in USD or EUR and often by the hour. Everything is
 * converted to an indicative VAT-inclusive rand price for comparison.
 *
 * Only providers with a South Africa or Europe region are included. Providers
 * that only serve the US, Asia or Australia are deliberately excluded.
 */

/** Indicative mid-market rates used for the comparison page. */
export const USD_ZAR = 16.9;
export const EUR_ZAR = 18.75;
export const VAT_RATE = 0.15;
export const HOURS_PER_MONTH = 730;

export type Currency = 'USD' | 'EUR';
export type IntlRegion = 'South Africa' | 'Europe';
export type Billing = 'monthly' | 'hourly';
export type StorageType = 'nvme' | 'ssd' | 'mixed' | 'unknown';

interface PlanInput {
  id: string;
  plan: string;
  vcpu: number;
  ramGb: number;
  /** Human-readable storage, because some plans mix SSD and NVMe. */
  storage: string;
  /** Comparable storage size. Zero when storage is billed separately (AWS EBS). */
  storageGb: number;
  storageType: StorageType;
  traffic: string;
  /** Month-to-month price in the provider's billing currency. */
  price: number;
  currency: Currency;
  billing: Billing;
  /** Hourly list price, when the provider bills hourly. */
  hourlyPrice?: number;
  features: string[];
}

export interface ProviderInput {
  slug: string;
  name: string;
  url: string;
  region: IntlRegion;
  plans: PlanInput[];
}

export interface IntlRow extends PlanInput {
  providerSlug: string;
  provider: string;
  providerUrl: string;
  region: IntlRegion;
  zarInclVatCents: number;
  pricePerGbRamCents: number;
  billingNote: string;
}

/** AWS EC2 on-demand Linux, shared tenancy, af-south-1. Storage is EBS, billed separately. */
function aws(
  id: string,
  plan: string,
  vcpu: number,
  ramGb: number,
  traffic: string,
  hourlyPrice: number,
): PlanInput {
  return {
    id: `aws-${id}`,
    plan,
    vcpu,
    ramGb,
    storage: 'EBS only',
    storageGb: 0,
    storageType: 'unknown',
    traffic,
    price: hourlyPrice * HOURS_PER_MONTH,
    hourlyPrice,
    currency: 'USD',
    billing: 'hourly',
    features: ['sa-regions', 'ipv6', 'api'],
  };
}

export const providers: ProviderInput[] = [
  {
    slug: 'vultr',
    name: 'Vultr',
    url: 'https://www.vultr.com/pricing/',
    region: 'South Africa',
    plans: [
      {
        id: 'vultr-1gb',
        plan: 'Cloud Compute 1GB',
        vcpu: 1,
        ramGb: 1,
        storage: '25 GB SSD',
        storageGb: 25,
        storageType: 'ssd',
        traffic: '1 TB',
        price: 5,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'vultr-2gb',
        plan: 'Cloud Compute 2GB',
        vcpu: 1,
        ramGb: 2,
        storage: '50 GB SSD',
        storageGb: 50,
        storageType: 'ssd',
        traffic: '2 TB',
        price: 10,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'vultr-4gb',
        plan: 'Cloud Compute 4GB',
        vcpu: 2,
        ramGb: 4,
        storage: '80 GB SSD',
        storageGb: 80,
        storageType: 'ssd',
        traffic: '3 TB',
        price: 20,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'vultr-8gb',
        plan: 'Cloud Compute 8GB',
        vcpu: 4,
        ramGb: 8,
        storage: '160 GB SSD',
        storageGb: 160,
        storageType: 'ssd',
        traffic: '4 TB',
        price: 40,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'vultr-16gb',
        plan: 'Cloud Compute 16GB',
        vcpu: 6,
        ramGb: 16,
        storage: '320 GB SSD',
        storageGb: 320,
        storageType: 'ssd',
        traffic: '5 TB',
        price: 80,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'vultr-32gb',
        plan: 'Cloud Compute 32GB',
        vcpu: 8,
        ramGb: 32,
        storage: '640 GB SSD',
        storageGb: 640,
        storageType: 'ssd',
        traffic: '6 TB',
        price: 160,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
    ],
  },
  {
    slug: 'akamai-linode',
    name: 'Akamai / Linode',
    url: 'https://www.linode.com/pricing/',
    region: 'South Africa',
    plans: [
      {
        id: 'linode-1gb',
        plan: 'Nanode 1GB',
        vcpu: 1,
        ramGb: 1,
        storage: '25 GB SSD',
        storageGb: 25,
        storageType: 'ssd',
        traffic: '1 TB',
        price: 5,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'linode-2gb',
        plan: 'Linode 2GB',
        vcpu: 1,
        ramGb: 2,
        storage: '50 GB SSD',
        storageGb: 50,
        storageType: 'ssd',
        traffic: '2 TB',
        price: 12,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'linode-4gb',
        plan: 'Linode 4GB',
        vcpu: 2,
        ramGb: 4,
        storage: '80 GB SSD',
        storageGb: 80,
        storageType: 'ssd',
        traffic: '4 TB',
        price: 24,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'linode-8gb',
        plan: 'Linode 8GB',
        vcpu: 4,
        ramGb: 8,
        storage: '160 GB SSD',
        storageGb: 160,
        storageType: 'ssd',
        traffic: '5 TB',
        price: 48,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'linode-16gb',
        plan: 'Linode 16GB',
        vcpu: 6,
        ramGb: 16,
        storage: '320 GB SSD',
        storageGb: 320,
        storageType: 'ssd',
        traffic: '8 TB',
        price: 96,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'linode-32gb',
        plan: 'Linode 32GB',
        vcpu: 8,
        ramGb: 32,
        storage: '640 GB SSD',
        storageGb: 640,
        storageType: 'ssd',
        traffic: '10 TB',
        price: 192,
        currency: 'USD',
        billing: 'hourly',
        features: ['sa-regions', 'ddos', 'ipv6', 'api'],
      },
    ],
  },
  {
    slug: 'aws',
    name: 'AWS',
    url: 'https://instances.vantage.sh/',
    region: 'South Africa',
    plans: [
      aws('t4g-micro', 't4g.micro', 2, 1, 'Up to 5 Gbps', 0.0108),
      aws('t4g-small', 't4g.small', 2, 2, 'Up to 5 Gbps', 0.0217),
      aws('t4g-medium', 't4g.medium', 2, 4, 'Up to 5 Gbps', 0.0434),
      aws('t3-small', 't3.small', 2, 2, 'Up to 5 Gbps', 0.0271),
      aws('t3-medium', 't3.medium', 2, 4, 'Up to 5 Gbps', 0.0542),
      aws('t4g-large', 't4g.large', 2, 8, 'Up to 5 Gbps', 0.0867),
      aws('t3-large', 't3.large', 2, 8, 'Up to 5 Gbps', 0.1085),
      aws('c6g-large', 'c6g.large', 2, 4, 'Up to 10 Gbps', 0.0912),
      aws('m6g-large', 'm6g.large', 2, 8, 'Up to 10 Gbps', 0.1016),
      aws('r6g-large', 'r6g.large', 2, 16, 'Up to 10 Gbps', 0.1344),
      aws('c6g-xlarge', 'c6g.xlarge', 4, 8, 'Up to 10 Gbps', 0.1824),
      aws('m6g-xlarge', 'm6g.xlarge', 4, 16, 'Up to 10 Gbps', 0.2032),
      aws('r6g-xlarge', 'r6g.xlarge', 4, 32, 'Up to 10 Gbps', 0.2688),
    ],
  },
  {
    slug: 'webdock',
    name: 'Webdock',
    url: 'https://webdock.io/pricing',
    region: 'Europe',
    plans: [
      {
        id: 'webdock-essential',
        plan: 'VPS Essential',
        vcpu: 1,
        ramGb: 2,
        storage: '15 GB NVMe',
        storageGb: 15,
        storageType: 'nvme',
        traffic: '1 TB',
        price: 2.15,
        currency: 'USD',
        billing: 'monthly',
        features: ['backups', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'webdock-advanced',
        plan: 'VPS Advanced',
        vcpu: 1,
        ramGb: 2,
        storage: '15 GB NVMe',
        storageGb: 15,
        storageType: 'nvme',
        traffic: '1 TB',
        price: 4.3,
        currency: 'USD',
        billing: 'monthly',
        features: ['backups', 'ddos', 'ipv6', 'api'],
      },
      {
        id: 'webdock-pro',
        plan: 'VPS Pro',
        vcpu: 6,
        ramGb: 10,
        storage: '40 GB NVMe',
        storageGb: 40,
        storageType: 'nvme',
        traffic: '7 TB',
        price: 19.6,
        currency: 'USD',
        billing: 'monthly',
        features: ['backups', 'ddos', 'ipv6', 'api'],
      },
    ],
  },
  {
    slug: 'contabo',
    name: 'Contabo',
    url: 'https://contabo.com/en/vps/',
    region: 'Europe',
    plans: [
      {
        id: 'contabo-cloud-vps-4',
        plan: 'Cloud VPS 4',
        vcpu: 4,
        ramGb: 8,
        storage: '100 GB SSD',
        storageGb: 100,
        storageType: 'ssd',
        traffic: 'Unlimited',
        price: 5.5,
        currency: 'EUR',
        billing: 'monthly',
        features: ['unlimited-bandwidth', 'snapshots', 'ddos', 'api'],
      },
      {
        id: 'contabo-cloud-vps-6',
        plan: 'Cloud VPS 6',
        vcpu: 6,
        ramGb: 12,
        storage: '200 GB SSD / 100 GB NVMe',
        storageGb: 200,
        storageType: 'mixed',
        traffic: 'Unlimited',
        price: 7.5,
        currency: 'EUR',
        billing: 'monthly',
        features: ['unlimited-bandwidth', 'snapshots', 'ddos', 'api'],
      },
      {
        id: 'contabo-cloud-vps-8',
        plan: 'Cloud VPS 8',
        vcpu: 8,
        ramGb: 24,
        storage: '300 GB SSD / 150 GB NVMe',
        storageGb: 300,
        storageType: 'mixed',
        traffic: 'Unlimited',
        price: 14,
        currency: 'EUR',
        billing: 'monthly',
        features: ['unlimited-bandwidth', 'snapshots', 'ddos', 'api'],
      },
      {
        id: 'contabo-cloud-vps-12',
        plan: 'Cloud VPS 12',
        vcpu: 12,
        ramGb: 48,
        storage: '400 GB SSD / 200 GB NVMe',
        storageGb: 400,
        storageType: 'mixed',
        traffic: 'Unlimited',
        price: 25,
        currency: 'EUR',
        billing: 'monthly',
        features: ['unlimited-bandwidth', 'snapshots', 'ddos', 'api'],
      },
      {
        id: 'contabo-cloud-vps-16',
        plan: 'Cloud VPS 16',
        vcpu: 16,
        ramGb: 64,
        storage: '500 GB SSD / 250 GB NVMe',
        storageGb: 500,
        storageType: 'mixed',
        traffic: 'Unlimited',
        price: 37,
        currency: 'EUR',
        billing: 'monthly',
        features: ['unlimited-bandwidth', 'snapshots', 'ddos', 'api'],
      },
      {
        id: 'contabo-cloud-vps-18',
        plan: 'Cloud VPS 18',
        vcpu: 18,
        ramGb: 96,
        storage: '600 GB SSD / 300 GB NVMe',
        storageGb: 600,
        storageType: 'mixed',
        traffic: 'Unlimited',
        price: 49,
        currency: 'EUR',
        billing: 'monthly',
        features: ['unlimited-bandwidth', 'snapshots', 'ddos', 'api'],
      },
    ],
  },
];

function billingNote(plan: PlanInput, providerSlug: string): string {
  if (providerSlug === 'contabo') {
    return plan.id === 'contabo-cloud-vps-4'
      ? '1-month contract · €2 setup fee'
      : '1-month contract · no setup fee';
  }
  if (providerSlug === 'webdock') {
    return 'Monthly or yearly · same price';
  }
  if (plan.billing === 'hourly') {
    return `Hourly billing · ${HOURS_PER_MONTH} h/mo estimate`;
  }
  return 'Month-to-month';
}

function zarInclVat(amount: number, currency: Currency): number {
  const rate = currency === 'EUR' ? EUR_ZAR : USD_ZAR;
  return Math.round(amount * rate * (1 + VAT_RATE) * 100);
}

export const rows: IntlRow[] = providers
  .flatMap((provider) =>
    provider.plans.map((plan) => ({
      ...plan,
      providerSlug: provider.slug,
      provider: provider.name,
      providerUrl: provider.url,
      region: provider.region,
      zarInclVatCents: zarInclVat(plan.price, plan.currency),
      pricePerGbRamCents: zarInclVat(plan.price, plan.currency) / plan.ramGb,
      billingNote: billingNote(plan, provider.slug),
    })),
  )
  .sort((a, b) => a.zarInclVatCents - b.zarInclVatCents);

export function formatMoney(amount: number, currency: Currency, decimals = 2): string {
  const symbol = currency === 'EUR' ? '€' : '$';
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
