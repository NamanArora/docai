import type { SearchResult } from './vector-search'

export interface RAGContext {
  chunks: SearchResult[]
  query: string
}

// Build a RAG prompt with retrieved documentation chunks
export function buildRAGPrompt(query: string, chunks: SearchResult[]): string {
  if (chunks.length === 0) {
    return `You are a helpful documentation assistant. The user asked: "${query}"\n\nUnfortunately, I couldn't find any relevant documentation to answer this question. Please let the user know that no relevant information was found in the indexed documentation.`
  }

  // Format chunks with headings and URLs for context
  const contextSections = chunks.map((chunk, idx) => {
    const heading = chunk.heading ? `\n## ${chunk.heading}\n` : '\n'
    const source = `[Source: ${chunk.url}]`
    return `--- Document Section ${idx + 1} ---
${source}${heading}
${chunk.content}
`
  }).join('\n')

  // Build the RAG prompt
  const prompt = `You are a helpful documentation assistant. Answer the user's question ONLY using the provided documentation below. Follow these rules:

1. ONLY use information from the provided documentation sections
2. If the documentation doesn't contain enough information to answer the question, say so
3. Include citations by referencing the source URLs in your answer
4. Be concise and accurate
5. Format your response in markdown

DOCUMENTATION:
${contextSections}

USER QUESTION:
${query}

Please provide a helpful answer based ONLY on the documentation above. Include relevant source URLs as citations.`

  return prompt
}

// Extract unique URLs from search results for citation display
export function extractCitations(chunks: SearchResult[]): Array<{ url: string; heading: string | null }> {
  const seen = new Set<string>()
  const citations: Array<{ url: string; heading: string | null }> = []

  for (const chunk of chunks) {
    if (!seen.has(chunk.url)) {
      seen.add(chunk.url)
      citations.push({
        url: chunk.url,
        heading: chunk.heading
      })
    }
  }

  return citations
}

// Format a list of citations as markdown links
export function formatCitations(citations: Array<{ url: string; heading: string | null }>): string {
  if (citations.length === 0) return ''

  const links = citations.map(c => {
    const label = c.heading || new URL(c.url).pathname
    return `- [${label}](${c.url})`
  }).join('\n')

  return `\n\n**Sources:**\n${links}`
}
