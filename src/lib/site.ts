export const SITE_NAME = 'VM Compare South Africa';
export const SITE_SHORT_NAME = 'VM Compare';
export const SITE_URL = 'https://vm-compare.fixes.co.za';
export const SITE_DESCRIPTION =
  'The cheapest VPS and VM prices in South African data centres, compared and updated weekly. Filter by RAM, vCPU and storage to find the best bang for your buck.';
export const CONTACT_EMAIL = 'https://github.com/aral190/vm-compare/discussions';
export const PUBLISHER_URL = 'https://number1.co.za';
export const GITHUB_URL = 'https://github.com/aral190/vm-compare';
export const CURRENT_YEAR = new Date().getFullYear();

export function absoluteUrl(pathname: string): string {
  if (pathname.startsWith('http')) return pathname;
  return `${SITE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export function mailtoLink(subject: string, body = ''): string {
  const params = new URLSearchParams();
  params.set('subject', subject);
  if (body) params.set('body', body);
  return `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}
