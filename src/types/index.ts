// Database types
export interface Document {
  id: string
  document_key: string
  root_url: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface DocumentSection {
  id: string
  document_id: string
  url: string
  heading: string
  content: string
  order_index: number
  embedding: number[]
  created_at: string
}

// Utility types
export interface Chunk {
  content: string
  url: string
  heading: string
  order_index: number
}

export interface CrawlProgress {
  discovered: number
  processed: number
  failed: number
  chunksCreated: number
  status: 'idle' | 'checking' | 'crawling' | 'completed' | 'error'
  message?: string
  currentUrl?: string
  failedUrls?: Array<{ url: string; error: string }>
  discoveredUrls?: string[]
}

export type LLMProvider = 'openai' | 'anthropic' | 'custom'

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  baseUrl?: string
  model?: string
}
