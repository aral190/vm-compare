import { SITE_URL } from './site';

const SITE_HOST = new URL(SITE_URL).hostname;
const DEFAULT_UTM_SOURCE = 'vm-compare.fixes.co.za';

/**
 * Add the referral source to external links.
 *
 * Override the value with PUBLIC_UTM_SOURCE in .env or the build environment.
 * Internal links and URLs that already have a utm_source are left unchanged.
 */
export function withUtm(url: string): string {
  if (!/^https?:\/\//i.test(url)) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === SITE_HOST) return url;

    if (!parsed.searchParams.has('utm_source')) {
      const source = import.meta.env.PUBLIC_UTM_SOURCE || DEFAULT_UTM_SOURCE;
      parsed.searchParams.set('utm_source', source);
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
