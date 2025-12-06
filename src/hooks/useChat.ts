import { useState, useCallback } from 'react'
import { generateEmbedding } from '@/lib/embeddings'
import { searchSimilarChunks } from '@/lib/vector-search'
import { buildRAGPrompt, extractCitations } from '@/lib/rag'
import { streamChatCompletion, type LLMConfig, type Message } from '@/lib/llm-client'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{ url: string; heading: string | null }>
  timestamp: number
}

export interface UseChatOptions {
  documentId: string
  llmConfig: LLMConfig
  topK?: number
}

export interface UseChatResult {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (query: string) => Promise<void>
  clearMessages: () => void
}

// Hook for chat functionality with RAG
export function useChat(options: UseChatOptions): UseChatResult {
  const { documentId, llmConfig, topK = 5 } = options

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim()) return
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])

    try {
      // Step 1: Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query)

      // Step 2: Search for similar chunks
      const searchResults = await searchSimilarChunks(queryEmbedding, documentId, topK)

      // Step 3: Build RAG prompt
      const ragPrompt = buildRAGPrompt(query, searchResults)

      // Step 4: Extract citations
      const citations = extractCitations(searchResults)

      // Step 5: Stream LLM response
      const assistantMessageId = `assistant-${Date.now()}`
      let fullResponse = ''

      // Create placeholder assistant message
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        citations,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Prepare messages for LLM
      const llmMessages: Message[] = [
        {
          role: 'user',
          content: ragPrompt
        }
      ]

      // Stream the response
      await streamChatCompletion(llmConfig, llmMessages, {
        onToken: (token: string) => {
          fullResponse += token
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullResponse }
                : msg
            )
          )
        },
        onComplete: () => {
          setIsLoading(false)
        },
        onError: (err: Error) => {
          setError(err.message)
          setIsLoading(false)
          // Remove the placeholder message on error
          setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId))
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      setIsLoading(false)
      // Remove user message on critical error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
    }
  }, [documentId, llmConfig, topK, isLoading])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages
  }
}
