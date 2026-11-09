import * as cheerio from 'cheerio';
import type { Provider, RawPlan } from '../../src/lib/schema';
import { slugify } from '../../src/lib/slug';

export interface Page {
  html: string;
  text: string;
}

export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, template').remove();
  $('br').replaceWith(' ');
  // Cheerio's .text() concatenates adjacent elements without a separator, which
  // turns "Small R219" into "SmallR219". Add a space to each element so block
  // boundaries survive the conversion.
  $('*').each((_, element) => {
    $(element).append(' ');
  });
  return $.root().text().replace(/\s+/g, ' ').trim();
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function price(value: string | undefined): number {
  return Number((value ?? '').replace(/[^0-9.]/g, ''));
}

function size(value: string | undefined, unit: string | undefined): number {
  const number = Number(value ?? 0);
  return (unit ?? 'GB').toUpperCase() === 'TB' ? number * 1000 : number;
}

function blocks(text: string, marker: RegExp): Array<{ match: RegExpMatchArray; block: string }> {
  const matches = [...text.matchAll(marker)];
  return matches.map((match, index) => ({
    match,
    block: text.slice(match.index ?? 0, matches[index + 1]?.index ?? text.length),
  }));
}

function dedupe(plans: RawPlan[]): RawPlan[] {
  const map = new Map<string, RawPlan>();
  for (const plan of plans) {
    if (plan.id && !map.has(plan.id)) map.set(plan.id, plan);
  }
  return [...map.values()];
}

function plan(provider: Provider, fields: Partial<RawPlan> & Pick<RawPlan, 'plan' | 'vcpu' | 'ramGb' | 'storageGb' | 'price'>): RawPlan {
  return {
    provider: provider.slug,
    storageType: 'unknown',
    bandwidth: 'Unspecified',
    billingTerm: 'monthly',
    setupFee: 0,
    ipv4: 1,
    location: provider.locations.join(' / ') || 'South Africa',
    url: provider.pricingUrl,
    features: [],
    status: 'current',
    notes: '',
    source: 'scrape',
    id: `${provider.slug}-${slugify(fields.plan)}`,
    ...fields,
  };
}

/** Rackzar: pricing page is behind Cloudflare, fetched as reader markdown. */
function parseRackzar(page: Page, provider: Provider): RawPlan[] {
  const text = normalize(page.text);
  const results: RawPlan[] = [];
  const pattern =
    /KLX(\d)\s+CPT JHB\s+R\s*([\d,.]+)\/pm\s+vCPU\s+(\d+)\s+Cores?\s+RAM\s+([\d.]+)\s*GB\s+NVMe\s+([\d.]+)\s*GB\s+Bandwidth\s+([\d.]+ GB|Unmetered)/g;

  for (const match of text.matchAll(pattern)) {
    const ramGb = Number(match[4]);
    const planName = `KLX${match[1]}`;
    results.push(
      plan(provider, {
        id: `${provider.slug}-${planName.toLowerCase()}`,
        plan: planName,
        vcpu: Number(match[3]),
        ramGb,
        storageGb: Number(match[5]),
        storageType: 'nvme',
        bandwidth: match[6],
        price: price(match[2]),
      }),
    );
  }
  return dedupe(results);
}

/** Absolute Hosting: WHMCS store behind Cloudflare, fetched as reader markdown. */
function parseAbsoluteHosting(page: Page, provider: Provider): RawPlan[] {
  const text = normalize(page.text);
  const results: RawPlan[] = [];
  const pattern =
    /Budget EPYC VPS (Silver|Palladium|Osmium|Iridium)\s+Starting from\s+R([\d,.]+)\s+Monthly[\s\S]*?(\d+)\s+CPU vCores?\s+([\d.]+)\s*GB RAM\s+([\d.]+)\s*GB NVMe Storage/g;

  for (const match of text.matchAll(pattern)) {
    const planName = `Budget EPYC VPS ${match[1]}`;
    results.push(
      plan(provider, {
        id: `${provider.slug}-${match[1].toLowerCase()}`,
        plan: planName,
        vcpu: Number(match[3]),
        ramGb: Number(match[4]),
        storageGb: Number(match[5]),
        storageType: 'nvme',
        bandwidth: 'Unlimited (AUP)',
        price: price(match[2]),
      }),
    );
  }
  return dedupe(results);
}

/** Cloud.co.za: recurring price is the "First month, then" price. */
function parseCloud(page: Page, provider: Provider): RawPlan[] {
  const text = normalize(page.text);
  const results: RawPlan[] = [];

  for (const { match, block } of blocks(text, /Linux VPS (LN\d)\*?/g)) {
    const planName = `Linux VPS ${match[1]}`;
    const recurring = block.match(/First month, then R([\d\s,.]+)pm/);
    const vcpu = block.match(/(\d+)\s+vCores?\s+Processor/);
    const ram = block.match(/([\d.]+)\s*GB\s+Memory/);
    const storage = block.match(/([\d.]+)\s*GB\s+SSD Storage/);
    if (!recurring || !vcpu || !ram || !storage) continue;
    results.push(
      plan(provider, {
        id: `${provider.slug}-${match[1].toLowerCase()}`,
        plan: planName,
        vcpu: Number(vcpu[1]),
        ramGb: Number(ram[1]),
        storageGb: Number(storage[1]),
        storageType: 'ssd',
        bandwidth: 'Unlimited',
        price: price(recurring[1]),
      }),
    );
  }
  return dedupe(results);
}

/** CloudAfrica: monthly price is quoted excluding VAT. */
function parseCloudAfrica(page: Page, provider: Provider): RawPlan[] {
  const text = normalize(page.text);
  const results: RawPlan[] = [];

  for (const { match, block } of blocks(text, /CA-[A-Z0-9-]+/g)) {
    const vcpu = block.match(/Cores:\s*(\d+)/);
    const ram = block.match(/RAM:\s*([\d.]+)\s*GiB/);
    const storage = block.match(/Storage:\s*([\d.]+)\s*GiB/);
    const monthly = block.match(/R([\d,.]+)\s*\/month/);
    if (!vcpu || !ram || !storage || !monthly) continue;
    const planName = match[0];
    results.push(
      plan(provider, {
        id: `${provider.slug}-${planName.toLowerCase()}`,
        plan: planName,
        vcpu: Number(vcpu[1]),
        ramGb: Number(ram[1]),
        storageGb: Number(storage[1]),
        storageType: 'ssd',
        bandwidth: 'Unspecified',
        price: price(monthly[1]),
      }),
    );
  }
  return dedupe(results);
}

/** Web Telecoms: fixed packages with traffic in GB or TB. */
function parseWebTelecoms(page: Page, provider: Provider): RawPlan[] {
  const text = normalize(page.text);
  const results: RawPlan[] = [];
  const pattern = /(Micro|Lite|Bronze|Silver|Gold)\s+VPS\s+R\s*([\d,.]+)\s+Monthly/g;

  for (const { match, block } of blocks(text, pattern)) {
    const storage = block.match(/([\d.]+)\s*GB Storage/);
    const traffic = block.match(/([\d.]+)\s*(GB|TB)\s+Traffic/);
    const ram = block.match(/([\d.]+)\s*(GB|MB)\s+RAM/);
    const vcpu = block.match(/(\d+)\s+vCPUs?/);
    if (!storage || !ram || !vcpu) continue;
    const ramGb = ram[2].toUpperCase() === 'MB' ? Number(ram[1]) / 1000 : Number(ram[1]);
    results.push(
      plan(provider, {
        id: `${provider.slug}-${match[1].toLowerCase()}`,
        plan: `${match[1]} VPS`,
        vcpu: Number(vcpu[1]),
        ramGb,
        storageGb: Number(storage[1]),
        storageType: 'ssd',
        bandwidth: traffic ? `${traffic[1]} ${traffic[2]}` : 'Unspecified',
        price: price(match[2]),
      }),
    );
  }
  return dedupe(results);
}

/** 1-grid: Small / Medium / Large SSD VPS. */
function parse1Grid(page: Page, provider: Provider): RawPlan[] {
  const text = normalize(page.text);
  const results: RawPlan[] = [];
  const pattern = /(Small|Medium|Large)\s+R([\d,]+)\s*\/month/g;

  for (const { match, block } of blocks(text, pattern)) {
    const vcpu = block.match(/(\d+)\s+vCPU core/);
    const ram = block.match(/([\d.]+)\s*GB RAM/);
    const storage = block.match(/([\d.]+)\s*GB SSD storage/);
    const bandwidth = block.match(/([\d.]+)\s*TB Bandwidth/);
    if (!vcpu || !ram || !storage) continue;
    results.push(
      plan(provider, {
        id: `${provider.slug}-${match[1].toLowerCase()}`,
        plan: `VPS ${match[1]}`,
        vcpu: Number(vcpu[1]),
        ramGb: Number(ram[1]),
        storageGb: Number(storage[1]),
        storageType: 'ssd',
        bandwidth: bandwidth ? `${bandwidth[1]} TB` : 'Unspecified',
        price: price(match[2]),
      }),
    );
  }
  return dedupe(results);
}

/** Domains.co.za: plan name, specs and VAT-inclusive price in one row. */
function parseDomains(page: Page, provider: Provider): RawPlan[] {
  const text = normalize(page.text);
  const results: RawPlan[] = [];
  const pattern =
    /Linux EPYC VPS (\d+)[\s\S]{0,80}?(\d+)\s+vCPUs?\s+([\d.]+)\s*GB\s+DDR5\s+([\d.]+)\s*(GB|TB)\s+NVMe\s+R([\d,.]+)/g;

  for (const match of text.matchAll(pattern)) {
    const order = Number(match[1]);
    const ramGb = Number(match[3]);
    results.push(
      plan(provider, {
        id: `${provider.slug}-vps-${ramGb}gb`,
        plan: `Linux EPYC VPS ${order}`,
        vcpu: Number(match[2]),
        ramGb,
        storageGb: size(match[4], match[5]),
        storageType: 'nvme',
        bandwidth: 'Unlimited',
        price: price(match[6]),
        location: 'Johannesburg (Teraco Isando)',
      }),
    );
  }
  return dedupe(results);
}

/** HostAfrica: first price is the recurring price, second is the first-month promo. */
function parseHostAfrica(page: Page, provider: Provider): RawPlan[] {
  const text = normalize(page.text);
  const results: RawPlan[] = [];

  for (const { match, block } of blocks(text, /Linux Cloud (C\d+)/g)) {
    const recurring = block.match(/First month, then R([\d,.]+)\/mo/);
    const vcpu = block.match(/(\d+)\s+vCPUs?/);
    const ram = block.match(/([\d.]+)\s*GB RAM/);
    const storage = block.match(/([\d.]+)\s*GB storage/);
    if (!recurring || !vcpu || !ram || !storage) continue;
    const planName = `Linux Cloud ${match[1]}`;
    results.push(
      plan(provider, {
        id: `${provider.slug}-${match[1].toLowerCase()}`,
        plan: planName,
        vcpu: Number(vcpu[1]),
        ramGb: Number(ram[1]),
        storageGb: Number(storage[1]),
        storageType: 'nvme',
        bandwidth: 'Unlimited',
        price: price(recurring[1]),
      }),
    );
  }
  return dedupe(results);
}

/** VirtualServers: VAT-inclusive monthly price per package. */
function parseVirtualServers(page: Page, provider: Provider): RawPlan[] {
  const text = normalize(page.text);
  const results: RawPlan[] = [];

  for (const { match, block } of blocks(text, /R\s*([\d,]+)\s*\/ month/g)) {
    const vcpu = block.match(/(\d+)\s*CPU vCores?/);
    const ram = block.match(/(\d+(?:\.\d+)?)\s*(GB|MB)\s*Memory/);
    const storage = block.match(/(\d+)\s*GB\s*NVMe(?:\s*Storage)?/);
    const traffic = block.match(/(\d+)\s*GB\s*Traffic/);
    if (!vcpu || !ram || !storage) continue;
    const ramGb = ram[2].toUpperCase() === 'MB' ? Number(ram[1]) / 1000 : Number(ram[1]);
    results.push(
      plan(provider, {
        id: `${provider.slug}-${String(ramGb).replace('.', '-')}gb`,
        plan: `NVMe VPS ${ramGb}GB`,
        vcpu: Number(vcpu[1]),
        ramGb,
        storageGb: Number(storage[1]),
        storageType: 'nvme',
        bandwidth: traffic ? `${traffic[1]} GB` : 'Unmetered',
        price: price(match[1]),
        location: 'Cape Town',
      }),
    );
  }
  return dedupe(results);
}

/** iVeCloud: list price lives in the data-amount attribute, in rand. */
function parseIveCloud(page: Page, provider: Provider): RawPlan[] {
  const html = page.html;
  const results: RawPlan[] = [];
  const pattern =
    /JHB - L SSD #(\d)[\s\S]{0,4000}?(\d+)GB SSD STORAGE[\s\S]{0,400}?(\d+) vCORE CPU[\s\S]{0,400}?(\d+)GB RAM[\s\S]{0,4000}?data-amount=([\d.]+)/g;

  for (const match of html.matchAll(pattern)) {
    const planName = `JHB L SSD #${match[1]}`;
    results.push(
      plan(provider, {
        id: `${provider.slug}-jhb-ssd-${match[1]}`,
        plan: planName,
        vcpu: Number(match[3]),
        ramGb: Number(match[4]),
        storageGb: Number(match[2]),
        storageType: 'ssd',
        bandwidth: 'Unmetered',
        price: price(match[5]),
        location: 'Johannesburg',
      }),
    );
  }
  return dedupe(results);
}

export const PARSERS: Record<string, (page: Page, provider: Provider) => RawPlan[]> = {
  rackzar: parseRackzar,
  absolutehosting: parseAbsoluteHosting,
  cloud: parseCloud,
  cloudafrica: parseCloudAfrica,
  webtelecoms: parseWebTelecoms,
  '1grid': parse1Grid,
  domains: parseDomains,
  hostafrica: parseHostAfrica,
  virtualservers: parseVirtualServers,
  ivecloud: parseIveCloud,
};
