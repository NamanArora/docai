import { describe, it, expect } from 'vitest'
import { chunkMarkdown } from './chunking'

describe('chunkMarkdown', () => {
  const url = 'https://example.com/docs/page'

  it('creates chunks of appropriate size', () => {
    const longText = 'Lorem ipsum dolor sit amet. '.repeat(50) // ~1400 chars
    const chunks = chunkMarkdown(longText, url)

    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(chunk => {
      expect(chunk.content.length).toBeGreaterThanOrEqual(100)
      expect(chunk.content.length).toBeLessThanOrEqual(900)
    })
  })

  it('preserves URL in all chunks', () => {
    const text = 'Lorem ipsum dolor sit amet. '.repeat(50)
    const chunks = chunkMarkdown(text, url)

    chunks.forEach(chunk => {
      expect(chunk.url).toBe(url)
    })
  })

  it('sets order_index sequentially', () => {
    const text = 'Lorem ipsum dolor sit amet. '.repeat(50)
    const chunks = chunkMarkdown(text, url)

    chunks.forEach((chunk, index) => {
      expect(chunk.order_index).toBe(index)
    })
  })

  it('extracts headings from markdown', () => {
    const markdown = `# Main Heading

This is some content under the main heading. Lorem ipsum dolor sit amet.

## Subheading

More content here. Lorem ipsum dolor sit amet.`

    const chunks = chunkMarkdown(markdown, url)

    expect(chunks.length).toBeGreaterThan(0)
    // At least one chunk should have extracted a heading
    const hasHeading = chunks.some(chunk =>
      chunk.heading === 'Main Heading' || chunk.heading === 'Subheading'
    )
    expect(hasHeading).toBe(true)
  })

  it('uses page title when no heading found', () => {
    const text = 'Just plain text without any headings. Lorem ipsum dolor sit amet.'
    const pageTitle = 'Test Page'
    const chunks = chunkMarkdown(text, url, pageTitle)

    expect(chunks[0].heading).toBe(pageTitle)
  })

  it('handles short content (no chunking needed)', () => {
    const shortText = 'This is a short piece of text.'
    const chunks = chunkMarkdown(shortText, url)

    expect(chunks.length).toBe(1)
    expect(chunks[0].content).toBe(shortText)
    expect(chunks[0].order_index).toBe(0)
  })

  it('handles empty content', () => {
    const chunks = chunkMarkdown('', url)
    expect(chunks).toEqual([])
  })

  it('handles whitespace-only content', () => {
    const chunks = chunkMarkdown('   \n\n  ', url)
    expect(chunks).toEqual([])
  })

  it('creates overlapping chunks', () => {
    // Create text long enough for multiple chunks
    const text = 'Sentence. '.repeat(150) // ~1500 chars
    const chunks = chunkMarkdown(text, url)

    if (chunks.length > 1) {
      // Check that there's some overlap between consecutive chunks
      // The last part of chunk[0] should appear in chunk[1]
      const chunk0End = chunks[0].content.slice(-50)
      const chunk1Start = chunks[1].content.slice(0, 100)

      // There should be some common text due to overlap
      const hasOverlap = chunk1Start.includes(chunk0End.trim().split(' ')[0])
      expect(hasOverlap).toBe(true)
    }
  })

  it('breaks at sentence boundaries when possible', () => {
    // Create text with clear sentence boundaries
    const sentences = Array.from({ length: 40 }, (_, i) =>
      `This is sentence number ${i + 1}.`
    ).join(' ')

    const chunks = chunkMarkdown(sentences, url)

    // Check that chunks generally end with sentence-ending punctuation
    const mostChunksEndWithPunctuation = chunks.slice(0, -1).filter(chunk => {
      const trimmed = chunk.content.trim()
      return trimmed.endsWith('.') || trimmed.endsWith('?') || trimmed.endsWith('!')
    }).length

    expect(mostChunksEndWithPunctuation).toBeGreaterThan(0)
  })

  it('maintains reasonable chunk sizes with varied content', () => {
    const markdown = `# Introduction

This is a long paragraph about various topics. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Section 1

More content here with different text. Ut enim ad minim veniam, quis nostrud exercitation ullamco
laboris nisi ut aliquip ex ea commodo consequat.

### Subsection

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
Excepteur sint occaecat cupidatat non proident.

## Section 2

Final section with more text. Lorem ipsum dolor sit amet. `.repeat(5)

    const chunks = chunkMarkdown(markdown, url, 'Test Document')

    expect(chunks.length).toBeGreaterThan(0)
    chunks.forEach(chunk => {
      // Should respect the min/max bounds (with some tolerance for last chunk)
      if (chunk.order_index < chunks.length - 1) {
        expect(chunk.content.length).toBeGreaterThanOrEqual(600)
      }
      expect(chunk.content.length).toBeLessThanOrEqual(950)
    })
  })

  it('handles code blocks and special characters', () => {
    const markdown = `# Code Example

Here's some code:

\`\`\`javascript
function example() {
  return "Hello, world!";
}
\`\`\`

This is regular text after the code block. Lorem ipsum dolor sit amet.`

    const chunks = chunkMarkdown(markdown, url)

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].content).toContain('function example()')
  })
})
