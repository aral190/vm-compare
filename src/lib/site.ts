export const SITE_NAME = 'VM Compare South Africa';
export const SITE_SHORT_NAME = 'VM Compare';
export const SITE_URL = 'https://vm-compare.fixes.co.za';
export const SITE_DESCRIPTION =
  'The cheapest VPS and VM prices in South African data centres, compared and updated weekly. Filter by RAM, vCPU and storage to find the best bang for your buck.';
export const PUBLISHER_URL = 'https://number1.co.za';
export const GITHUB_URL = 'https://github.com/aral190/vm-compare';
export const GITHUB_DISCUSSIONS_URL = 'https://github.com/aral190/vm-compare/discussions';
export const CURRENT_YEAR = new Date().getFullYear();

export function absoluteUrl(pathname: string): string {
  if (pathname.startsWith('http')) return pathname;
  return `${SITE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
