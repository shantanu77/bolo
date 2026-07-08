export const SITE_URL = 'https://auraxpress.com'
export const SITE_NAME = 'AuraXpress'
export const SITE_TITLE = 'AuraXpress — AI Communication Coach for Professionals'
export const SITE_DESCRIPTION =
  'AuraXpress is an AI English speaking coach for Indian professionals. Practice workplace communication with voice scenarios, 6-dimension feedback, and role-specific model answers.'
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
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl('/icon.png'),
  description: SITE_DESCRIPTION,
  email: 'helloaura@auraxpress.com',
  contactPoint: [{
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'helloaura@auraxpress.com',
    availableLanguage: ['English', 'Hindi'],
  }],
  areaServed: {
    '@type': 'Country',
    name: 'India',
  },
  sameAs: [] as string[],
}

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { '@id': `${SITE_URL}/#organization` },
}

export const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/#software`,
  name: SITE_NAME,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  publisher: { '@id': `${SITE_URL}/#organization` },
  audience: {
    '@type': 'Audience',
    audienceType: 'Indian professionals, students, managers, founders, sales teams, and support teams',
  },
  featureList: [
    'Voice-first English speaking practice',
    'AI-generated workplace scenarios',
    'Personalised categories from a voice introduction',
    '6-dimension communication evaluation',
    'Filler word and speaking pace feedback',
    'Spoken model responses',
  ],
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

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
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
