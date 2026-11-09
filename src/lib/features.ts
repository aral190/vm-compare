export interface FeatureInfo {
  label: string;
  short: string;
  description: string;
}

export const FEATURES: Record<string, FeatureInfo> = {
  nvme: {
    label: 'NVMe',
    short: 'NVMe',
    description: 'NVMe solid-state storage: much faster than SATA SSD for databases and busy sites.',
  },
  ssd: {
    label: 'SSD',
    short: 'SSD',
    description: 'Solid-state storage. Faster than spinning disks, though usually slower than NVMe.',
  },
  epyc: {
    label: 'AMD EPYC',
    short: 'EPYC',
    description: 'AMD EPYC server processors, generally strong multi-core performance.',
  },
  kvm: {
    label: 'KVM',
    short: 'KVM',
    description: 'KVM virtualisation with a real kernel and full root access.',
  },
  backups: {
    label: 'Backups',
    short: 'Backups',
    description: 'The provider offers backups or snapshots, sometimes as a paid add-on.',
  },
  snapshots: {
    label: 'Snapshots',
    short: 'Snapshots',
    description: 'Point-in-time snapshots you can restore quickly.',
  },
  'one-click': {
    label: 'One-click installs',
    short: '1-click',
    description: 'Application templates such as WordPress, Docker, n8n or WireGuard.',
  },
  api: {
    label: 'API / CLI',
    short: 'API',
    description: 'Provision and manage servers programmatically.',
  },
  ddos: {
    label: 'DDoS protection',
    short: 'DDoS',
    description: 'Network-level DDoS filtering is included.',
  },
  ipv6: {
    label: 'IPv6',
    short: 'IPv6',
    description: 'Native IPv6 connectivity is available.',
  },
  'unlimited-bandwidth': {
    label: 'Unlimited traffic',
    short: 'Unlimited',
    description: 'Traffic is unlimited or unmetered, usually subject to a fair-use policy.',
  },
  'root-access': {
    label: 'Root access',
    short: 'Root',
    description: 'Full administrative access to the server.',
  },
  firewall: {
    label: 'Firewall',
    short: 'Firewall',
    description: 'A managed firewall or security-group control panel is provided.',
  },
  console: {
    label: 'Console',
    short: 'Console',
    description: 'Browser-based console access when SSH is unavailable.',
  },
  'dedicated-ip': {
    label: 'Dedicated IPv4',
    short: 'IPv4',
    description: 'A dedicated public IPv4 address is included.',
  },
  'local-support': {
    label: 'Local support',
    short: 'Local support',
    description: 'South African support during local business hours.',
  },
  'managed-optional': {
    label: 'Managed option',
    short: 'Managed',
    description: 'A fully managed option is available at extra cost.',
  },
  sla: {
    label: 'SLA',
    short: 'SLA',
    description: 'A published uptime service-level agreement.',
  },
};

export function featureInfo(key: string): FeatureInfo {
  return FEATURES[key] ?? {
    label: key,
    short: key,
    description: key,
  };
}
