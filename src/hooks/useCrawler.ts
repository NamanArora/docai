import { useState } from 'react'
import type { Document, CrawlProgress } from '@/types'
import { normalizeUrl, computeDocumentKey, isAllowedUrl, extractLinksFromMarkdown } from '@/lib/url-utils'
import { fetchMarkdownFromUrl } from '@/lib/jina-client'
import { chunkMarkdown } from '@/lib/chunking'
import { generateBatchEmbeddings, initializeEmbeddingModel } from '@/lib/embeddings'
import { checkDocumentExists, upsertDocument, upsertChunks } from '@/lib/supabase'

const MAX_DISCOVERED = 300
const MAX_PROCESSED = 100
const MAX_DEPTH = 3
const CONCURRENT_REQUESTS = 5

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

      // Pre-initialize embedding model
      setProgress({
        discovered: 0,
        processed: 0,
        failed: 0,
        chunksCreated: 0,
        status: 'checking',
        message: 'Loading embedding model (one-time download, ~25 MB)...',
      })

      await initializeEmbeddingModel()

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

      // Helper function to process a single URL
      const processSingleUrl = async (
        currentUrl: string,
        depth: number
      ): Promise<{
        success: boolean
        url: string
        error?: string
        chunks?: number
        newLinks?: string[]
      }> => {
        try {
          // Fetch markdown
          const result = await fetchMarkdownFromUrl(currentUrl)

          if (!result.success) {
            return {
              success: false,
              url: currentUrl,
              error: result.error || 'Unknown error',
            }
          }

          // Chunk markdown
          const chunks = chunkMarkdown(result.markdown, currentUrl, result.title)

          if (chunks.length === 0) {
            return {
              success: false,
              url: currentUrl,
              error: 'No content chunks created',
            }
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

          // Extract new links if depth allows
          const newLinks: string[] = []
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
                  newLinks.push(normalizedLink)
                }
              } catch (error) {
                // Skip invalid links
                continue
              }
            }
          }

          return {
            success: true,
            url: currentUrl,
            chunks: chunks.length,
            newLinks,
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          return {
            success: false,
            url: currentUrl,
            error: errorMsg,
          }
        }
      }

      // Process URLs in parallel batches
      while (queue.length > 0 && processed.size < MAX_PROCESSED) {
        // Create batch of URLs to process
        const batch: Array<{ url: string; depth: number }> = []
        while (
          batch.length < CONCURRENT_REQUESTS &&
          queue.length > 0 &&
          processed.size + batch.length < MAX_PROCESSED
        ) {
          const item = queue.shift()!
          if (!processed.has(item.url)) {
            batch.push(item)
          }
        }

        if (batch.length === 0) {
          break
        }

        // Update progress with first URL in batch
        setProgress(prev => ({
          ...prev,
          currentUrl: batch[0].url,
          message: `Processing ${batch.length} page${batch.length > 1 ? 's' : ''} in parallel...`,
        }))

        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map(item => processSingleUrl(item.url, item.depth))
        )

        // Handle results and update shared state
        for (let i = 0; i < results.length; i++) {
          const result = results[i]
          const { url, depth } = batch[i]

          processed.add(url)

          if (result.status === 'fulfilled') {
            const urlResult = result.value

            if (urlResult.success) {
              // Success - update chunks and add new links
              totalChunks += urlResult.chunks || 0

              // Add new links to queue
              if (urlResult.newLinks && urlResult.newLinks.length > 0) {
                for (const link of urlResult.newLinks) {
                  if (!discovered.has(link) && discovered.size < MAX_DISCOVERED) {
                    discovered.add(link)
                    queue.push({ url: link, depth: depth + 1 })

                    if (discovered.size >= MAX_DISCOVERED) {
                      break
                    }
                  }
                }
              }
            } else {
              // Failed with error
              failedUrls.push({ url: urlResult.url, error: urlResult.error || 'Unknown error' })
            }
          } else {
            // Promise rejected
            failedUrls.push({
              url,
              error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
            })
          }
        }

        // Update progress after batch
        setProgress(prev => ({
          ...prev,
          discovered: discovered.size,
          processed: processed.size,
          failed: failedUrls.length,
          chunksCreated: totalChunks,
          failedUrls,
        }))
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
