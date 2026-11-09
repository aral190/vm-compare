import { SITE_URL } from './site';

const SITE_HOST = new URL(SITE_URL).hostname;

export interface UtmOptions {
  campaign?: string;
  content?: string;
  medium?: string;
  source?: string;
}

/**
 * Add standard referral UTM parameters to external links.
 *
 * Existing UTM values are preserved, and internal links are returned unchanged.
 */
export function withUtm(url: string, options: UtmOptions = {}): string {
  if (!/^https?:\/\//i.test(url)) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname === SITE_HOST) return url;

    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', options.source ?? 'vm-compare');
    }
    if (!parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', options.medium ?? 'referral');
    }
    if (options.campaign && !parsed.searchParams.has('utm_campaign')) {
      parsed.searchParams.set('utm_campaign', options.campaign);
    }
    if (options.content && !parsed.searchParams.has('utm_content')) {
      parsed.searchParams.set('utm_content', options.content);
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
