import { supabase } from './supabase'

export interface SearchResult {
  id: string
  document_id: string
  content: string
  url: string
  heading: string | null
  order_index: number
  similarity: number
}

// Search for similar document sections using vector similarity
export async function searchSimilarChunks(
  queryEmbedding: number[],
  documentId: string,
  k: number = 5
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase.rpc('match_sections', {
      query_embedding: queryEmbedding,
      filter_document_id: documentId,
      match_count: k
    })

    if (error) {
      console.error('Vector search error:', error)
      throw new Error(`Vector search failed: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map((row: any) => ({
      id: row.id,
      document_id: row.document_id,
      content: row.content,
      url: row.url,
      heading: row.heading,
      order_index: row.order_index,
      similarity: row.similarity
    }))
  } catch (err) {
    console.error('Unexpected error in searchSimilarChunks:', err)
    throw err
  }
}
