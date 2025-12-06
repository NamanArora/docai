import { useState, useEffect, useRef } from 'react'
import { useCrawler } from './hooks/useCrawler'
import { useChat } from './hooks/useChat'
import { useToast } from './hooks/useToast'
import { UrlInput } from './components/UrlInput'
import { CrawlProgressDisplay } from './components/CrawlProgress'
import { Chat } from './components/Chat'
import { ToastContainer } from './components/Toast'
import { validateApiKey, type LLMProvider } from './lib/llm-client'
import { computeDocumentKey, normalizeUrl } from './lib/url-utils'
import { checkDocumentExists } from './lib/supabase'

type Mode = 'crawl' | 'config' | 'chat'

function App() {
  const { progress, document, startCrawl, reset } = useCrawler()
  const [url, setUrl] = useState('https://docs.stripe.com/payments')
  const [mode, setMode] = useState<Mode>('crawl')
  const toast = useToast()
  const prevStatusRef = useRef(progress.status)

  // LLM Configuration
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [configError, setConfigError] = useState('')

  // Force Reindex state
  const [documentExists, setDocumentExists] = useState(false)
  const [showReindexConfirm, setShowReindexConfirm] = useState(false)

  // Chat hook - only initialize if we have a document
  const chatHook = useChat({
    documentId: document?.id || '',
    llmConfig: {
      provider: llmProvider,
      apiKey: apiKey
    }
  })

  // Show toast notifications on status changes
  useEffect(() => {
    const prevStatus = prevStatusRef.current
    const currentStatus = progress.status

    if (prevStatus !== currentStatus) {
      if (currentStatus === 'completed') {
        toast.success(progress.message || 'Documentation indexed successfully!')
      } else if (currentStatus === 'error') {
        toast.error(progress.message || 'Crawl failed')
      }

      prevStatusRef.current = currentStatus
    }
  }, [progress.status, progress.message, toast])

  // Check if document exists for current URL
  useEffect(() => {
    const checkUrlExists = async () => {
      if (!url.trim()) {
        setDocumentExists(false)
        return
      }

      try {
        const normalized = normalizeUrl(url)
        const docKey = computeDocumentKey(normalized)
        const exists = await checkDocumentExists(docKey)
        setDocumentExists(!!exists)
      } catch {
        setDocumentExists(false)
      }
    }

    const timeoutId = setTimeout(checkUrlExists, 500)
    return () => clearTimeout(timeoutId)
  }, [url])

  const handleStartCrawl = async () => {
    if (!url.trim()) return
    await startCrawl(url)
  }

  const handleReset = () => {
    reset()
    setMode('crawl')
    chatHook.clearMessages()
    toast.info('Reset to start new crawl')
  }

  const handleForceReindex = () => {
    setShowReindexConfirm(true)
  }

  const handleConfirmReindex = async () => {
    setShowReindexConfirm(false)
    if (!url.trim()) return
    await startCrawl(url, true) // true = force reindex
  }

  const handleCancelReindex = () => {
    setShowReindexConfirm(false)
  }

  const handleStartChat = () => {
    setConfigError('')

    if (!validateApiKey(llmProvider, apiKey)) {
      setConfigError('Invalid API key format. Please check your API key.')
      return
    }

    setMode('chat')
    toast.success('Chat mode activated')
  }

  const isLoading = progress.status === 'crawling' || progress.status === 'checking'
  const isIdle = progress.status === 'idle'
  const isCrawlComplete = progress.status === 'completed' && document

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <div className="min-h-screen bg-background paper-texture">
        {/* Header */}
        <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-ink mb-1">
                DocAI
              </h1>
              <p className="text-sm text-ink-light italic">
                Technical Documentation Archive & Retrieval System
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs mono text-ink-light">
              <span className="px-2 py-1 bg-amber-light border border-amber/30 rounded">
                v1.0
              </span>
              <span className="px-2 py-1 bg-teal-light border border-teal/30 rounded">
                BETA
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Mode: Crawl */}
        {mode === 'crawl' && (
          <>
            {/* Catalog Header */}
            <div className="catalog-header fade-in">
              <h2 className="text-2xl font-semibold text-ink mb-2">
                Documentation Catalog
              </h2>
              <p className="text-ink-light leading-relaxed">
                Index technical documentation from any source. Our client-side crawling system
                processes and embeds documentation for intelligent retrieval.
              </p>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* URL Input Section */}
              <div className={isIdle || isLoading ? 'lg:col-span-2' : ''}>
                <UrlInput
                  url={url}
                  onUrlChange={setUrl}
                  onStartCrawl={handleStartCrawl}
                  onForceReindex={handleForceReindex}
                  disabled={isLoading}
                  isLoading={isLoading}
                  documentExists={documentExists}
                />
              </div>

              {/* Progress Section */}
              {!isIdle && (
                <div className="lg:col-span-2 fade-in-delay-1">
                  <CrawlProgressDisplay
                    progress={progress}
                    document={document}
                    onReset={handleReset}
                  />
                </div>
              )}
            </div>

            {/* Chat Button - Show when crawl is complete */}
            {isCrawlComplete && (
              <div className="mt-8 fade-in-delay-2">
                <button
                  onClick={() => setMode('config')}
                  className="btn btn-primary w-full lg:w-auto px-8 py-4"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Start Chatting with Documentation
                  </span>
                </button>
              </div>
            )}

            {/* Features Grid */}
            {isIdle && (
              <div className="mt-12 fade-in-delay-2">
                <h3 className="text-xl font-semibold text-ink mb-6">
                  System Capabilities
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-6 bg-card border-2 border-border rounded-lg hover:border-amber/30 transition-all duration-300">
                    <div className="w-12 h-12 mb-4 rounded-lg bg-amber-light flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-amber"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-ink mb-2">
                      Intelligent Crawling
                    </h4>
                    <p className="text-sm text-ink-light leading-relaxed">
                      BFS algorithm processes up to 100 pages with depth limits and scope validation.
                    </p>
                  </div>

                  <div className="p-6 bg-card border-2 border-border rounded-lg hover:border-teal/30 transition-all duration-300">
                    <div className="w-12 h-12 mb-4 rounded-lg bg-teal-light flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-teal"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-ink mb-2">
                      Client-Side Embeddings
                    </h4>
                    <p className="text-sm text-ink-light leading-relaxed">
                      Generate 384-dimensional vectors using Transformers.js in your browser.
                    </p>
                  </div>

                  <div className="p-6 bg-card border-2 border-border rounded-lg hover:border-purple-600/30 transition-all duration-300">
                    <div className="w-12 h-12 mb-4 rounded-lg bg-purple-50 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                        />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-ink mb-2">
                      Vector Search
                    </h4>
                    <p className="text-sm text-ink-light leading-relaxed">
                      Powered by Supabase with pgvector for semantic similarity search.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Mode: LLM Configuration */}
        {mode === 'config' && (
          <div className="max-w-2xl mx-auto fade-in">
            <div className="library-card">
              <div className="mb-6">
                <h2 className="text-3xl font-semibold text-ink mb-2">
                  Configure AI Provider
                </h2>
                <p className="text-ink-light">
                  Choose your AI provider and enter your API key to start chatting
                </p>
              </div>

              <div className="space-y-6">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-3">
                    AI Provider
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setLlmProvider('openai')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        llmProvider === 'openai'
                          ? 'border-amber bg-amber-light/50'
                          : 'border-border bg-card hover:border-amber/30'
                      }`}
                    >
                      <p className="font-semibold text-ink">OpenAI</p>
                      <p className="text-xs text-ink-light mt-1">GPT-4o Mini</p>
                    </button>
                    <button
                      onClick={() => setLlmProvider('anthropic')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        llmProvider === 'anthropic'
                          ? 'border-amber bg-amber-light/50'
                          : 'border-border bg-card hover:border-amber/30'
                      }`}
                    >
                      <p className="font-semibold text-ink">Anthropic</p>
                      <p className="text-xs text-ink-light mt-1">Claude 3.5 Haiku</p>
                    </button>
                  </div>
                </div>

                {/* API Key Input */}
                <div>
                  <label htmlFor="api-key" className="block text-sm font-medium text-ink mb-2">
                    API Key
                  </label>
                  <input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="input-field"
                    placeholder={
                      llmProvider === 'openai' ? 'sk-...' : 'sk-ant-...'
                    }
                  />
                  <p className="mt-2 text-xs text-ink-light/70 italic">
                    Your API key is stored only in browser memory and never sent to our servers
                  </p>
                </div>

                {/* Error Display */}
                {configError && (
                  <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{configError}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setMode('crawl')}
                    className="btn btn-secondary flex-1"
                  >
                    <span className="relative z-10">Back</span>
                  </button>
                  <button
                    onClick={handleStartChat}
                    className="btn btn-primary flex-1"
                    disabled={!apiKey.trim()}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                      Continue to Chat
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode: Chat */}
        {mode === 'chat' && document && (
          <div className="max-w-5xl mx-auto h-[calc(100vh-200px)] fade-in">
            <Chat
              messages={chatHook.messages}
              onSendMessage={chatHook.sendMessage}
              isLoading={chatHook.isLoading}
              error={chatHook.error}
              onClearMessages={chatHook.clearMessages}
            />
          </div>
        )}

        {/* Footer Info */}
        <footer className="mt-16 pt-8 border-t-2 border-border text-center">
          <p className="text-xs text-ink-light mono">
            MILESTONE 8 · PRODUCTION READY · FULL STACK COMPLETE
          </p>
          <p className="text-xs text-ink-light/60 mt-2">
            Powered by Jina AI Reader · Transformers.js · Supabase · OpenAI · Anthropic
          </p>
        </footer>
      </main>
      </div>

      {/* Confirmation Dialog for Force Reindex */}
      {showReindexConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="library-card max-w-md m-4 fade-in">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-ink mb-2">
                Confirm Force Reindex
              </h3>
              <p className="text-ink-light leading-relaxed">
                This will permanently delete all existing chunks and embeddings for this documentation,
                then re-crawl and re-index from scratch.
              </p>
            </div>

            <div className="p-4 bg-amber-light/30 border-l-4 border-amber rounded-r mb-6">
              <p className="text-sm text-ink-light">
                <strong className="text-ink">Warning:</strong> This action cannot be undone.
                The re-indexing process may take several minutes.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelReindex}
                className="btn btn-secondary flex-1"
              >
                <span className="relative z-10">Cancel</span>
              </button>
              <button
                onClick={handleConfirmReindex}
                className="btn btn-primary flex-1"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Confirm Reindex
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
