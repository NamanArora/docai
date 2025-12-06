import { pipeline, env } from '@xenova/transformers'

// Configure transformers.js environment
env.allowLocalModels = false
env.allowRemoteModels = true

// Model cache (using any to avoid type issues with transformers.js)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modelPipeline: any = null
let modelLoadError: Error | null = null
let isLoading = false

export interface EmbeddingModelStatus {
  loaded: boolean
  loading: boolean
  error: Error | null
}

// Check if browser supports embeddings
export function isBrowserSupported(): boolean {
  // Check for basic WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    return false
  }

  // Check for required APIs
  if (typeof ArrayBuffer === 'undefined' || typeof Float32Array === 'undefined') {
    return false
  }

  return true
}

// Initialize embedding model (lazy loading)
export async function initializeEmbeddingModel(): Promise<void> {
  if (modelPipeline) {
    return
  }

  if (modelLoadError) {
    throw modelLoadError
  }

  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (modelPipeline) return
    if (modelLoadError) throw modelLoadError
  }

  isLoading = true

  try {
    // Load the all-MiniLM-L6-v2 model for feature extraction
    modelPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        quantized: true,
      }
    )
  } catch (error) {
    modelLoadError = error instanceof Error ? error : new Error('Failed to load embedding model')
    throw modelLoadError
  } finally {
    isLoading = false
  }
}

// Get current model status
export function getModelStatus(): EmbeddingModelStatus {
  return {
    loaded: modelPipeline !== null,
    loading: isLoading,
    error: modelLoadError
  }
}

// Generate embedding for single text
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!isBrowserSupported()) {
    throw new Error('Your browser does not support on-device embeddings. Try Chrome desktop.')
  }

  // Initialize model if not already loaded
  await initializeEmbeddingModel()

  if (!modelPipeline) {
    throw new Error('Embedding model not initialized')
  }

  // Generate embedding
  const output = await modelPipeline(text, {
    pooling: 'mean',
    normalize: true,
  })

  // Extract the embedding array
  const embedding = Array.from(output.data) as number[]

  // Verify dimensionality (should be 384 for all-MiniLM-L6-v2)
  if (embedding.length !== 384) {
    throw new Error(`Unexpected embedding dimension: ${embedding.length}. Expected 384.`)
  }

  return embedding
}

// Generate embeddings for batch of texts
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!isBrowserSupported()) {
    throw new Error('Your browser does not support on-device embeddings. Try Chrome desktop.')
  }

  if (texts.length === 0) {
    return []
  }

  // Initialize model if not already loaded
  await initializeEmbeddingModel()

  if (!modelPipeline) {
    throw new Error('Embedding model not initialized')
  }

  // Process texts in parallel for better performance
  const embeddingPromises = texts.map(async (text) => {
    const output = await modelPipeline(text, {
      pooling: 'mean',
      normalize: true,
    })

    const embedding = Array.from(output.data) as number[]

    if (embedding.length !== 384) {
      throw new Error(`Unexpected embedding dimension: ${embedding.length}. Expected 384.`)
    }

    return embedding
  })

  return await Promise.all(embeddingPromises)
}

// Clean up resources
export function disposeModel(): void {
  modelPipeline = null
  modelLoadError = null
  isLoading = false
}
