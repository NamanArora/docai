import { describe, it, expect } from 'vitest'
import {
  normalizeUrl,
  computeDocumentKey,
  isAllowedUrl,
  extractLinksFromMarkdown
} from './url-utils'

describe('normalizeUrl', () => {
  it('converts URL to lowercase', () => {
    const result = normalizeUrl('https://DOCS.STRIPE.COM/payments')
    expect(result).toBe('https://docs.stripe.com/payments/')
  })

  it('strips query parameters', () => {
    const result = normalizeUrl('https://docs.stripe.com/payments?ref=123')
    expect(result).toBe('https://docs.stripe.com/payments/')
  })

  it('strips hash fragments', () => {
    const result = normalizeUrl('https://docs.stripe.com/payments#top')
    expect(result).toBe('https://docs.stripe.com/payments/')
  })

  it('standardizes trailing slash', () => {
    const result = normalizeUrl('https://docs.stripe.com/payments')
    expect(result).toBe('https://docs.stripe.com/payments/')
  })

  it('removes default index.html', () => {
    const result = normalizeUrl('https://docs.stripe.com/payments/index.html')
    expect(result).toBe('https://docs.stripe.com/payments/')
  })

  it('removes default index.htm', () => {
    const result = normalizeUrl('https://docs.stripe.com/payments/index.htm')
    expect(result).toBe('https://docs.stripe.com/payments/')
  })

  it('handles complete example from PRD', () => {
    const result = normalizeUrl('https://DOCS.STRIPE.COM/payments/?ref=123#top')
    expect(result).toBe('https://docs.stripe.com/payments/')
  })

  it('preserves file extensions', () => {
    const result = normalizeUrl('https://docs.stripe.com/api/payment.json')
    expect(result).toBe('https://docs.stripe.com/api/payment.json')
  })

  it('throws error for invalid URLs', () => {
    expect(() => normalizeUrl('not-a-url')).toThrow('Invalid URL')
  })
})

describe('computeDocumentKey', () => {
  it('extracts domain + path for Stripe docs', () => {
    const result = computeDocumentKey('https://stripe.com/docs')
    expect(result).toBe('stripe.com/docs')
  })

  it('extracts domain + path for Next.js docs', () => {
    const result = computeDocumentKey('https://nextjs.org/docs/app')
    expect(result).toBe('nextjs.org/docs/app')
  })

  it('extracts domain + path for PayPal API', () => {
    const result = computeDocumentKey('https://developer.paypal.com/api')
    expect(result).toBe('developer.paypal.com/api')
  })

  it('removes trailing slash from document key', () => {
    const result = computeDocumentKey('https://docs.stripe.com/payments/')
    expect(result).toBe('docs.stripe.com/payments')
  })

  it('normalizes before computing key', () => {
    const result = computeDocumentKey('https://DOCS.STRIPE.COM/payments/?ref=123#top')
    expect(result).toBe('docs.stripe.com/payments')
  })
})

describe('isAllowedUrl', () => {
  const seedUrl = 'https://docs.stripe.com/payments'
  const documentKey = 'docs.stripe.com/payments'

  it('allows URLs with same domain and prefix', () => {
    const result = isAllowedUrl(
      'https://docs.stripe.com/payments/accept-a-payment',
      seedUrl,
      documentKey
    )
    expect(result).toBe(true)
  })

  it('rejects URLs from different domains', () => {
    const result = isAllowedUrl(
      'https://example.com/docs',
      seedUrl,
      documentKey
    )
    expect(result).toBe(false)
  })

  it('rejects URLs without canonical prefix', () => {
    const result = isAllowedUrl(
      'https://docs.stripe.com/about',
      seedUrl,
      documentKey
    )
    expect(result).toBe(false)
  })

  it('rejects /blog paths', () => {
    const result = isAllowedUrl(
      'https://docs.stripe.com/payments/blog/article',
      seedUrl,
      documentKey
    )
    expect(result).toBe(false)
  })

  it('rejects /pricing paths', () => {
    const result = isAllowedUrl(
      'https://docs.stripe.com/payments/pricing',
      seedUrl,
      documentKey
    )
    expect(result).toBe(false)
  })

  it('rejects /legal paths', () => {
    const result = isAllowedUrl(
      'https://docs.stripe.com/payments/legal/terms',
      seedUrl,
      documentKey
    )
    expect(result).toBe(false)
  })

  it('rejects /careers paths', () => {
    const result = isAllowedUrl(
      'https://docs.stripe.com/payments/careers',
      seedUrl,
      documentKey
    )
    expect(result).toBe(false)
  })

  it('rejects /changelog paths', () => {
    const result = isAllowedUrl(
      'https://docs.stripe.com/payments/changelog',
      seedUrl,
      documentKey
    )
    expect(result).toBe(false)
  })

  it('handles invalid URLs gracefully', () => {
    const result = isAllowedUrl(
      'not-a-url',
      seedUrl,
      documentKey
    )
    expect(result).toBe(false)
  })
})

describe('extractLinksFromMarkdown', () => {
  it('extracts markdown links', () => {
    const markdown = '[Link 1](https://example.com/page1) and [Link 2](https://example.com/page2)'
    const result = extractLinksFromMarkdown(markdown, 'https://example.com')
    expect(result).toEqual([
      'https://example.com/page1',
      'https://example.com/page2'
    ])
  })

  it('resolves relative URLs', () => {
    const markdown = '[Relative](./page1) and [Another](/page2)'
    const result = extractLinksFromMarkdown(markdown, 'https://example.com/docs/')
    expect(result).toContain('https://example.com/docs/page1')
    expect(result).toContain('https://example.com/page2')
  })

  it('skips anchor links', () => {
    const markdown = '[Section](#section) and [Page](https://example.com/page)'
    const result = extractLinksFromMarkdown(markdown, 'https://example.com')
    expect(result).toEqual(['https://example.com/page'])
  })

  it('skips empty links', () => {
    const markdown = '[Empty]() and [Valid](https://example.com/page)'
    const result = extractLinksFromMarkdown(markdown, 'https://example.com')
    expect(result).toEqual(['https://example.com/page'])
  })

  it('removes duplicate links', () => {
    const markdown = '[Link 1](https://example.com/page) and [Link 2](https://example.com/page)'
    const result = extractLinksFromMarkdown(markdown, 'https://example.com')
    expect(result).toEqual(['https://example.com/page'])
  })

  it('resolves relative paths as URLs', () => {
    const markdown = '[Relative](not-a-url) and [Valid](https://example.com/page)'
    const result = extractLinksFromMarkdown(markdown, 'https://example.com')
    expect(result).toContain('https://example.com/page')
    // "not-a-url" is treated as a relative path
    expect(result.length).toBe(2)
  })

  it('returns empty array for no links', () => {
    const markdown = 'Just some text without links'
    const result = extractLinksFromMarkdown(markdown, 'https://example.com')
    expect(result).toEqual([])
  })
})
