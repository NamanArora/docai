import { useState } from 'react'
import type { Document, CrawlProgress } from '@/types'
import { normalizeUrl, computeDocumentKey, isAllowedUrl, extractLinksFromMarkdown } from '@/lib/url-utils'
import { fetchMarkdownFromUrl } from '@/lib/jina-client'
import { chunkMarkdown } from '@/lib/chunking'
import { generateBatchEmbeddings } from '@/lib/embeddings'
import { checkDocumentExists, upsertDocument, upsertChunks } from '@/lib/supabase'

const MAX_DISCOVERED = 300
const MAX_PROCESSED = 100
const MAX_DEPTH = 3

export interface UseCrawlerResult {
  progress: CrawlProgress
  document: Document | null
  startCrawl: (url: string) => Promise<void>
  reset: () => void
}

// Custom hook for crawling documentation
export function useCrawler(): UseCrawlerResult {
  const [progress, setProgress] = useState<CrawlProgress>({
    discovered: 0,
    processed: 0,
    failed: 0,
    chunksCreated: 0,
    status: 'idle',
  })
  const [document, setDocument] = useState<Document | null>(null)

  // Reset crawler state
  const reset = () => {
    setProgress({
      discovered: 0,
      processed: 0,
      failed: 0,
      chunksCreated: 0,
      status: 'idle',
    })
    setDocument(null)
  }

  // Start crawling process
  const startCrawl = async (seedUrl: string) => {
    try {
      // Normalize seed URL
      const normalizedSeedUrl = normalizeUrl(seedUrl)
      const documentKey = computeDocumentKey(normalizedSeedUrl)

      // Check if document already exists
      setProgress({
        discovered: 0,
        processed: 0,
        failed: 0,
        chunksCreated: 0,
        status: 'checking',
        message: 'Checking if documentation already exists...',
      })

      const existingDoc = await checkDocumentExists(documentKey)

      if (existingDoc) {
        setDocument(existingDoc)
        setProgress({
          discovered: 0,
          processed: 0,
          failed: 0,
          chunksCreated: 0,
          status: 'completed',
          message: 'Documentation already indexed',
        })
        return
      }

      // Create new document
      const newDoc = await upsertDocument(documentKey, normalizedSeedUrl)
      setDocument(newDoc)

      // Start crawling
      setProgress({
        discovered: 1,
        processed: 0,
        failed: 0,
        chunksCreated: 0,
        status: 'crawling',
        message: 'Starting crawl...',
        currentUrl: normalizedSeedUrl,
      })

      // BFS crawl
      const queue: Array<{ url: string; depth: number }> = [
        { url: normalizedSeedUrl, depth: 0 }
      ]
      const discovered = new Set<string>([normalizedSeedUrl])
      const processed = new Set<string>()
      const failedUrls: Array<{ url: string; error: string }> = []

      let totalChunks = 0

      while (queue.length > 0 && processed.size < MAX_PROCESSED) {
        const { url: currentUrl, depth } = queue.shift()!

        // Skip if already processed
        if (processed.has(currentUrl)) {
          continue
        }

        // Update progress
        setProgress(prev => ({
          ...prev,
          currentUrl,
          message: `Processing: ${currentUrl}`,
        }))

        try {
          // Fetch markdown
          const result = await fetchMarkdownFromUrl(currentUrl)

          if (!result.success) {
            failedUrls.push({ url: currentUrl, error: result.error || 'Unknown error' })
            setProgress(prev => ({
              ...prev,
              failed: prev.failed + 1,
              failedUrls,
            }))
            processed.add(currentUrl)
            continue
          }

          // Chunk markdown
          const chunks = chunkMarkdown(result.markdown, currentUrl, result.title)

          if (chunks.length === 0) {
            failedUrls.push({ url: currentUrl, error: 'No content chunks created' })
            setProgress(prev => ({
              ...prev,
              failed: prev.failed + 1,
              failedUrls,
            }))
            processed.add(currentUrl)
            continue
          }

          // Generate embeddings for all chunks
          const embeddings = await generateBatchEmbeddings(
            chunks.map(c => c.content)
          )

          // Prepare chunks with embeddings
          const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
            ...chunk,
            embedding: embeddings[idx],
          }))

          // Upsert to Supabase
          await upsertChunks(newDoc.id, chunksWithEmbeddings)

          totalChunks += chunks.length
          processed.add(currentUrl)

          // Update progress
          setProgress(prev => ({
            ...prev,
            processed: processed.size,
            chunksCreated: totalChunks,
            failedUrls,
          }))

          // Extract and queue new links (if depth allows)
          if (depth < MAX_DEPTH && discovered.size < MAX_DISCOVERED) {
            const links = extractLinksFromMarkdown(result.markdown, currentUrl)

            for (const link of links) {
              try {
                const normalizedLink = normalizeUrl(link)

                // Check if allowed and not already discovered
                if (
                  !discovered.has(normalizedLink) &&
                  isAllowedUrl(normalizedLink, normalizedSeedUrl, documentKey)
                ) {
                  discovered.add(normalizedLink)
                  queue.push({ url: normalizedLink, depth: depth + 1 })

                  // Update discovered count
                  setProgress(prev => ({
                    ...prev,
                    discovered: discovered.size,
                  }))

                  // Stop if we've hit the max discovered limit
                  if (discovered.size >= MAX_DISCOVERED) {
                    break
                  }
                }
              } catch (error) {
                // Skip invalid links
                continue
              }
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          failedUrls.push({ url: currentUrl, error: errorMsg })
          setProgress(prev => ({
            ...prev,
            failed: prev.failed + 1,
            failedUrls,
          }))
          processed.add(currentUrl)
        }
      }

      // Check if we have enough chunks
      if (totalChunks < 5) {
        setProgress({
          discovered: discovered.size,
          processed: processed.size,
          failed: failedUrls.length,
          chunksCreated: totalChunks,
          status: 'error',
          message: 'Documentation incomplete. Cannot start chat. (Less than 5 chunks created)',
          failedUrls,
        })
        return
      }

      // Crawl completed successfully
      setProgress({
        discovered: discovered.size,
        processed: processed.size,
        failed: failedUrls.length,
        chunksCreated: totalChunks,
        status: 'completed',
        message: `Successfully indexed ${processed.size} pages with ${totalChunks} chunks`,
        failedUrls,
      })
    } catch (error) {
      setProgress(prev => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Crawl failed',
      }))
    }
  }

  return {
    progress,
    document,
    startCrawl,
    reset,
  }
}
