export function formatRand(cents: number, options: { decimals?: boolean } = {}): string {
  const rand = cents / 100;
  const showCents = options.decimals ?? !Number.isInteger(rand);
  const formatted = rand.toLocaleString('en-US', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
  return `R${formatted}`;
}

export function formatRandCompact(cents: number): string {
  const rand = Math.round(cents / 100);
  return `R${rand.toLocaleString('en-US')}`;
}

export function formatGb(value: number): string {
  return `${formatNumber(value)} GB`;
}

export function formatStorage(gb: number): string {
  if (gb >= 1000) {
    const tb = gb / 1000;
    return `${formatNumber(tb)} TB`;
  }
  return `${formatNumber(gb)} GB`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatPerGbRam(cents: number): string {
  return `${formatRand(Math.round(cents))}/GB`;
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function storageLabel(type: string): string {
  switch (type) {
    case 'nvme':
      return 'NVMe';
    case 'ssd':
      return 'SSD';
    case 'hdd':
      return 'HDD';
    default:
      return 'Storage';
  }
}
