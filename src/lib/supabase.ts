import { createClient } from '@supabase/supabase-js'
import type { Document } from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Check if document exists by document_key
export async function checkDocumentExists(documentKey: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('document_key', documentKey)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data
}

// Delete document by document_key (CASCADE deletes sections automatically)
export async function deleteDocument(documentKey: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('document_key', documentKey)

  if (error) throw error
}

// Create or update document
export async function upsertDocument(documentKey: string, rootUrl: string): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .upsert({
      document_key: documentKey,
      root_url: rootUrl,
      metadata: {}
    }, {
      onConflict: 'document_key'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Upsert document sections with embeddings
export async function upsertChunks(
  documentId: string,
  chunks: Array<{
    url: string
    heading: string
    content: string
    order_index: number
    embedding: number[]
  }>
): Promise<void> {
  const sections = chunks.map(chunk => ({
    document_id: documentId,
    url: chunk.url,
    heading: chunk.heading,
    content: chunk.content,
    order_index: chunk.order_index,
    embedding: chunk.embedding
  }))

  const { error } = await supabase
    .from('document_sections')
    .upsert(sections)

  if (error) throw error
}
