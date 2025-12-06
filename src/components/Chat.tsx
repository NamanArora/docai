import { useEffect, useRef } from 'react'
import { ChatMessageDisplay } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { ChatMessage } from '@/hooks/useChat'

interface ChatProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading: boolean
  error: string | null
  onClearMessages: () => void
}

// Main chat interface component
export function Chat({
  messages,
  onSendMessage,
  isLoading,
  error,
  onClearMessages
}: ChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  return (
    <div className="library-card fade-in h-full flex flex-col">
      {/* Chat header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-border">
        <div>
          <h2 className="text-3xl font-semibold text-ink mb-2">
            Research Assistant
          </h2>
          <p className="text-sm text-ink-light">
            Ask questions about the indexed documentation
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClearMessages}
            className="btn btn-secondary text-sm px-4 py-2"
            disabled={isLoading}
          >
            Clear History
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="chat-messages-container flex-1 overflow-y-auto mb-6"
      >
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="w-16 h-16 mb-4 rounded-full bg-amber-light flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-amber"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-ink mb-2 text-center">
              Start a Research Query
            </h3>
            <p className="text-sm text-ink-light text-center max-w-md mx-auto leading-relaxed">
              Ask any question about the documentation. I'll search the indexed content
              and provide accurate answers with source citations.
            </p>

            {/* Example queries */}
            <div className="mt-8 space-y-3 max-w-lg mx-auto">
              <p className="text-xs font-semibold text-ink-light uppercase tracking-wide text-center mb-4">
                Example Queries
              </p>
              <button
                onClick={() => onSendMessage('How do I get started?')}
                className="example-query-button"
                disabled={isLoading}
              >
                <span className="text-amber mr-2">→</span>
                How do I get started?
              </button>
              <button
                onClick={() => onSendMessage('What are the main features?')}
                className="example-query-button"
                disabled={isLoading}
              >
                <span className="text-amber mr-2">→</span>
                What are the main features?
              </button>
              <button
                onClick={() => onSendMessage('Show me code examples')}
                className="example-query-button"
                disabled={isLoading}
              >
                <span className="text-amber mr-2">→</span>
                Show me code examples
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => (
              <ChatMessageDisplay key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="font-medium text-red-900 mb-1">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      <div className="chat-input-section">
        <ChatInput
          onSend={onSendMessage}
          disabled={isLoading}
          placeholder={
            isLoading
              ? 'Searching documentation and generating response...'
              : 'Ask a question about the documentation...'
          }
        />
      </div>
    </div>
  )
}
