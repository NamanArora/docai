import { useState, useEffect } from 'react'
import {
  initializeEmbeddingModel,
  getModelStatus,
  isBrowserSupported,
  type EmbeddingModelStatus
} from '@/lib/embeddings'

export interface UseEmbeddingsResult {
  status: EmbeddingModelStatus
  isSupported: boolean
  initialize: () => Promise<void>
}

// Custom hook for managing embedding model lifecycle
export function useEmbeddings(autoInitialize = false): UseEmbeddingsResult {
  const [status, setStatus] = useState<EmbeddingModelStatus>(getModelStatus())
  const [isSupported] = useState(() => isBrowserSupported())

  // Initialize model
  const initialize = async () => {
    if (!isSupported) {
      setStatus({
        loaded: false,
        loading: false,
        error: new Error('Your browser does not support on-device embeddings. Try Chrome desktop.')
      })
      return
    }

    setStatus({ ...getModelStatus(), loading: true })

    try {
      await initializeEmbeddingModel()
      setStatus(getModelStatus())
    } catch (error) {
      setStatus({
        loaded: false,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to initialize embedding model')
      })
    }
  }

  // Auto-initialize if requested
  useEffect(() => {
    if (autoInitialize && isSupported) {
      initialize()
    }
  }, [autoInitialize, isSupported])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't dispose the model on unmount to keep it cached
      // It will be reused if the component remounts
    }
  }, [])

  return {
    status,
    isSupported,
    initialize
  }
}
