export const SITE_URL = 'https://auraxpress.com'
export const SITE_NAME = 'AuraXpress'
export const SITE_TITLE = 'AuraXpress — AI Communication Coach for Professionals'
export const SITE_DESCRIPTION =
  'AuraXpress is an AI-powered communication coach that listens to you speak, scores you across 6 dimensions, and plays back a stronger version — tailored to your job, industry, and the real situations you face at work.'
export const TWITTER_HANDLE = '@auraxpress'

export function absoluteUrl(path: string = '/'): string {
  return new URL(path, SITE_URL).toString()
}

// Next.js does NOT deep-merge nested metadata objects (openGraph, twitter) between
// a layout and a page — a page that sets `openGraph` replaces the parent's wholesale.
// Spread this into every page-level `openGraph` so type/siteName/locale/images survive.
export function pageOpenGraph(overrides: { url: string; title: string; description: string }) {
  return {
    type: 'website' as const,
    locale: 'en_IN',
    siteName: SITE_NAME,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE_NAME }],
    ...overrides,
  }
}

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl('/icon.png'),
  description: SITE_DESCRIPTION,
  email: 'hello@auraxpress.com',
  sameAs: [] as string[],
}

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/features?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

export const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'INR',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '499',
      priceCurrency: 'INR',
    },
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '2000',
  },
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}
