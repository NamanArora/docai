import type { Chunk } from '@/types'

const MIN_CHUNK_SIZE = 700
const MAX_CHUNK_SIZE = 900
const OVERLAP_SIZE = 100

// Extract heading from markdown text
function extractHeading(text: string): string {
  const headingMatch = text.match(/^#{1,6}\s+(.+)$/m)
  return headingMatch ? headingMatch[1].trim() : ''
}

// Find last sentence boundary before maxLength
function findBreakpoint(text: string, maxLength: number): number {
  // Try to break at sentence boundary
  const sentenceEnders = ['. ', '.\n', '? ', '?\n', '! ', '!\n']
  let breakpoint = -1

  for (const ender of sentenceEnders) {
    const idx = text.lastIndexOf(ender, maxLength)
    if (idx > breakpoint && idx > MIN_CHUNK_SIZE) {
      breakpoint = idx + ender.length
    }
  }

  // If no sentence boundary found, try paragraph break
  if (breakpoint === -1) {
    const paragraphBreak = text.lastIndexOf('\n\n', maxLength)
    if (paragraphBreak > MIN_CHUNK_SIZE) {
      breakpoint = paragraphBreak + 2
    }
  }

  // If still no good breakpoint, try any newline
  if (breakpoint === -1) {
    const newlineBreak = text.lastIndexOf('\n', maxLength)
    if (newlineBreak > MIN_CHUNK_SIZE) {
      breakpoint = newlineBreak + 1
    }
  }

  // Fall back to max length if no better option
  if (breakpoint === -1) {
    breakpoint = maxLength
  }

  return breakpoint
}

// Chunk markdown content into overlapping sections
export function chunkMarkdown(
  markdown: string,
  url: string,
  pageTitle?: string
): Chunk[] {
  const chunks: Chunk[] = []
  let position = 0
  let orderIndex = 0

  // Clean and normalize markdown
  const cleanMarkdown = markdown.trim()

  if (cleanMarkdown.length === 0) {
    return chunks
  }

  while (position < cleanMarkdown.length) {
    const remaining = cleanMarkdown.slice(position)

    // Determine chunk size
    let chunkSize: number
    if (remaining.length <= MAX_CHUNK_SIZE) {
      // Last chunk - take everything remaining
      chunkSize = remaining.length
    } else {
      // Find optimal breakpoint between MIN and MAX
      chunkSize = findBreakpoint(remaining, MAX_CHUNK_SIZE)
    }

    const chunkText = remaining.slice(0, chunkSize).trim()

    if (chunkText.length > 0) {
      // Extract heading from this chunk
      const heading = extractHeading(chunkText) || pageTitle || ''

      chunks.push({
        content: chunkText,
        url,
        heading,
        order_index: orderIndex++
      })
    }

    // Move position forward, accounting for overlap
    if (position + chunkSize >= cleanMarkdown.length) {
      // No more text, exit loop
      break
    } else {
      // Move forward with overlap
      position += chunkSize - OVERLAP_SIZE
    }
  }

  return chunks
}
