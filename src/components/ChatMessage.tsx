import type { ChatMessage } from '@/hooks/useChat'
import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
  message: ChatMessage
}

// Display a single chat message with citations
export function ChatMessageDisplay({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`message-container ${isUser ? 'user-message' : 'assistant-message'}`}>
      {/* Role indicator */}
      <div className="message-header">
        <span className="message-role">
          {isUser ? 'Query' : 'Response'}
        </span>
        <span className="message-timestamp">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>

      {/* Message content */}
      <div className="message-content">
        {isUser ? (
          <p className="text-ink leading-relaxed">{message.content}</p>
        ) : (
          <>
            <div className="prose-manuscript">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-4 last:mb-0 leading-relaxed text-ink">{children}</p>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className
                    if (isInline) {
                      return (
                        <code className="px-1.5 py-0.5 rounded bg-parchment-dark/50 text-amber mono text-sm border border-border">
                          {children}
                        </code>
                      )
                    }
                    return (
                      <pre className="p-4 rounded-lg bg-ink/5 border-2 border-border overflow-x-auto my-4">
                        <code className="mono text-sm text-ink">{children}</code>
                      </pre>
                    )
                  },
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-2 my-4 text-ink">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-2 my-4 text-ink">
                      {children}
                    </ol>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-ink">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-ink-light">{children}</em>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-ink mb-4 mt-6 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-ink mb-3 mt-5 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-ink mb-2 mt-4 first:mt-0">
                      {children}
                    </h3>
                  ),
                }}
              >
                {message.content || '_Composing response..._'}
              </ReactMarkdown>
            </div>

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="citations-section">
                <div className="citations-header">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Source References</span>
                </div>
                <ol className="citations-list">
                  {message.citations.map((citation, idx) => (
                    <li key={idx} className="citation-item">
                      <span className="citation-number">[{idx + 1}]</span>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="citation-link"
                      >
                        {citation.heading || new URL(citation.url).pathname}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
