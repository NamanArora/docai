// Jina AI Reader client for fetching markdown from URLs
const JINA_READER_BASE_URL = 'https://r.jina.ai'

export interface JinaReaderResponse {
  code: number
  status: number
  data: {
    title: string
    description?: string
    url: string
    content: string
    usage?: {
      tokens: number
    }
  }
}

export interface FetchMarkdownResult {
  markdown: string
  title: string
  url: string
  success: boolean
  error?: string
}

// Fetch markdown from URL using Jina Reader API
export async function fetchMarkdownFromUrl(url: string): Promise<FetchMarkdownResult> {
  try {
    // Jina Reader API: https://r.jina.ai/{url}
    const jinaUrl = `${JINA_READER_BASE_URL}/${encodeURIComponent(url)}`

    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Return-Format': 'markdown',
        'X-Robots-Txt': 'JinaReader',
      },
    })

    if (!response.ok) {
      // Handle HTTP errors
      if (response.status === 403) {
        return {
          markdown: '',
          title: '',
          url,
          success: false,
          error: 'Protected by Cloudflare / Bot Blocked'
        }
      }

      if (response.status === 404) {
        return {
          markdown: '',
          title: '',
          url,
          success: false,
          error: 'Page not found'
        }
      }

      if (response.status === 429) {
        return {
          markdown: '',
          title: '',
          url,
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        }
      }

      return {
        markdown: '',
        title: '',
        url,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }

    // Parse response
    const data: JinaReaderResponse = await response.json()

    // Validate response
    if (!data.data || !data.data.content) {
      return {
        markdown: '',
        title: '',
        url,
        success: false,
        error: 'Page returned unreadable markdown'
      }
    }

    const markdown = data.data.content.trim()

    // Check if markdown is too short or empty
    if (markdown.length < 50) {
      return {
        markdown: '',
        title: '',
        url,
        success: false,
        error: 'Documentation could not be parsed (content too short)'
      }
    }

    return {
      markdown,
      title: data.data.title || '',
      url: data.data.url || url,
      success: true
    }
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        markdown: '',
        title: '',
        url,
        success: false,
        error: 'Network error: Unable to reach the URL'
      }
    }

    return {
      markdown: '',
      title: '',
      url,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Validate markdown content quality
export function isValidMarkdown(markdown: string): boolean {
  if (!markdown || markdown.trim().length < 50) {
    return false
  }

  // Check for common error patterns
  const errorPatterns = [
    /access denied/i,
    /403 forbidden/i,
    /404 not found/i,
    /cloudflare/i,
    /captcha/i,
  ]

  for (const pattern of errorPatterns) {
    if (pattern.test(markdown)) {
      return false
    }
  }

  return true
}
