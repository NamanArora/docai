// Normalize URL to ensure consistent formatting
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)

    // Convert to lowercase
    let normalized = urlObj.origin.toLowerCase() + urlObj.pathname.toLowerCase()

    // Remove query params and hash
    // (already handled by not including search and hash)

    // Remove default filenames
    normalized = normalized.replace(/\/index\.(html?|php)$/i, '/')

    // Standardize trailing slash
    if (!normalized.endsWith('/') && !normalized.match(/\.[a-z0-9]+$/i)) {
      normalized += '/'
    }

    return normalized
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`)
  }
}

// Extract domain + path prefix to create document key
export function computeDocumentKey(url: string): string {
  const normalized = normalizeUrl(url)
  const urlObj = new URL(normalized)

  // Remove protocol and trailing slash for document key
  let key = urlObj.host + urlObj.pathname
  if (key.endsWith('/')) {
    key = key.slice(0, -1)
  }

  return key
}

// Check if URL is allowed for crawling
export function isAllowedUrl(
  url: string,
  seedUrl: string,
  documentKey: string
): boolean {
  try {
    const normalized = normalizeUrl(url)
    const normalizedSeed = normalizeUrl(seedUrl)

    const urlObj = new URL(normalized)
    const seedObj = new URL(normalizedSeed)

    // Must be same domain
    if (urlObj.host !== seedObj.host) {
      return false
    }

    // Must begin with canonical prefix
    const prefix = '/' + documentKey.split('/').slice(1).join('/')
    if (!urlObj.pathname.startsWith(prefix)) {
      return false
    }

    // Check for disallowed paths
    const disallowedPaths = ['/blog', '/pricing', '/legal', '/careers', '/changelog']
    for (const disallowed of disallowedPaths) {
      if (urlObj.pathname.includes(disallowed)) {
        return false
      }
    }

    return true
  } catch (error) {
    return false
  }
}

// Extract links from markdown content
export function extractLinksFromMarkdown(markdown: string, baseUrl: string): string[] {
  const links: string[] = []
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

  let match
  while ((match = linkRegex.exec(markdown)) !== null) {
    const href = match[2]

    // Skip anchors and empty links
    if (!href || href.startsWith('#')) {
      continue
    }

    try {
      // Resolve relative URLs
      const absoluteUrl = new URL(href, baseUrl).href
      links.push(absoluteUrl)
    } catch (error) {
      // Skip invalid URLs
      continue
    }
  }

  // Remove duplicates
  return [...new Set(links)]
}
