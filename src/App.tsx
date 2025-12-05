import { useState } from 'react'
import { useEmbeddings } from './hooks/useEmbeddings'
import { useCrawler } from './hooks/useCrawler'
import { generateEmbedding } from './lib/embeddings'

function App() {
  const { status: embeddingStatus, isSupported, initialize } = useEmbeddings()
  const { progress, document, startCrawl, reset } = useCrawler()

  const [testUrl, setTestUrl] = useState('https://docs.stripe.com/payments')
  const [testText, setTestText] = useState('Hello, world!')
  const [embedding, setEmbedding] = useState<number[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle crawl start
  const handleStartCrawl = async () => {
    if (!testUrl.trim()) return
    await startCrawl(testUrl)
  }

  // Handle embedding generation test
  const handleGenerateEmbedding = async () => {
    setIsGenerating(true)
    setError(null)
    setEmbedding(null)

    try {
      const result = await generateEmbedding(testText)
      setEmbedding(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate embedding')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          DocAI
        </h1>
        <p className="text-gray-600 mb-8">
          Chat with any documentation
        </p>

        {/* Crawler Test UI */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Documentation Crawler</h2>

          {/* URL Input */}
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="doc-url" className="block text-sm font-medium mb-2">
                Documentation URL:
              </label>
              <input
                id="doc-url"
                type="url"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://docs.example.com"
                disabled={progress.status === 'crawling' || progress.status === 'checking'}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleStartCrawl}
                disabled={progress.status === 'crawling' || progress.status === 'checking' || !testUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {progress.status === 'crawling' ? 'Crawling...' : progress.status === 'checking' ? 'Checking...' : 'Start Crawl'}
              </button>

              {progress.status !== 'idle' && (
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Progress Display */}
          {progress.status !== 'idle' && (
            <div className="space-y-4">
              {/* Status Badge */}
              <div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  progress.status === 'checking' ? 'bg-blue-100 text-blue-800' :
                  progress.status === 'crawling' ? 'bg-yellow-100 text-yellow-800' :
                  progress.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {progress.status === 'checking' && 'Checking'}
                  {progress.status === 'crawling' && 'Crawling'}
                  {progress.status === 'completed' && 'Completed'}
                  {progress.status === 'error' && 'Error'}
                </span>
              </div>

              {/* Message */}
              {progress.message && (
                <p className="text-sm text-gray-700">{progress.message}</p>
              )}

              {/* Current URL */}
              {progress.currentUrl && progress.status === 'crawling' && (
                <p className="text-xs text-gray-500 truncate">
                  Current: {progress.currentUrl}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-xs text-blue-600 font-medium">Discovered</p>
                  <p className="text-2xl font-bold text-blue-900">{progress.discovered}</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-xs text-green-600 font-medium">Processed</p>
                  <p className="text-2xl font-bold text-green-900">{progress.processed}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-xs text-purple-600 font-medium">Chunks</p>
                  <p className="text-2xl font-bold text-purple-900">{progress.chunksCreated}</p>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-xs text-red-600 font-medium">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{progress.failed}</p>
                </div>
              </div>

              {/* Document Info */}
              {document && (
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm font-medium text-gray-700">Document ID:</p>
                  <p className="text-xs text-gray-600 font-mono break-all">{document.id}</p>
                  <p className="text-sm font-medium text-gray-700 mt-2">Document Key:</p>
                  <p className="text-xs text-gray-600">{document.document_key}</p>
                </div>
              )}

              {/* Failed URLs */}
              {progress.failedUrls && progress.failedUrls.length > 0 && (
                <details className="bg-red-50 p-4 rounded">
                  <summary className="cursor-pointer text-sm font-medium text-red-900">
                    Failed URLs ({progress.failedUrls.length})
                  </summary>
                  <ul className="mt-2 space-y-2 text-xs">
                    {progress.failedUrls.slice(0, 10).map((item, idx) => (
                      <li key={idx} className="text-red-700">
                        <span className="font-mono">{item.url}</span>
                        <br />
                        <span className="text-red-600">{item.error}</span>
                      </li>
                    ))}
                    {progress.failedUrls.length > 10 && (
                      <li className="text-red-600">
                        ... and {progress.failedUrls.length - 10} more
                      </li>
                    )}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Embedding Model Test UI */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Embedding Model Test</h2>

          {/* Browser Support Status */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Browser Support:</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
              isSupported
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {isSupported ? '✓ Supported' : '✗ Not Supported'}
            </span>
          </div>

          {/* Model Status */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Model Status:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Loading:</span>
                <span className={`font-medium ${embeddingStatus.loading ? 'text-blue-600' : 'text-gray-400'}`}>
                  {embeddingStatus.loading ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Loaded:</span>
                <span className={`font-medium ${embeddingStatus.loaded ? 'text-green-600' : 'text-gray-400'}`}>
                  {embeddingStatus.loaded ? 'Yes' : 'No'}
                </span>
              </div>
              {embeddingStatus.error && (
                <div className="text-sm text-red-600">
                  Error: {embeddingStatus.error.message}
                </div>
              )}
            </div>
          </div>

          {/* Initialize Button */}
          {!embeddingStatus.loaded && !embeddingStatus.loading && isSupported && (
            <button
              onClick={initialize}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mb-4"
            >
              Initialize Model
            </button>
          )}

          {/* Test Input */}
          {embeddingStatus.loaded && (
            <div className="space-y-4">
              <div>
                <label htmlFor="test-text" className="block text-sm font-medium mb-2">
                  Test Text:
                </label>
                <input
                  id="test-text"
                  type="text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter text to generate embedding..."
                />
              </div>

              <button
                onClick={handleGenerateEmbedding}
                disabled={isGenerating || !testText.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate Embedding'}
              </button>

              {/* Results */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                  {error}
                </div>
              )}

              {embedding && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="font-medium text-green-900 mb-2">
                    ✓ Embedding Generated Successfully
                  </p>
                  <p className="text-sm text-green-700 mb-2">
                    Dimensions: {embedding.length}
                  </p>
                  <p className="text-xs text-gray-600 font-mono break-all">
                    [{embedding.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...]
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {embeddingStatus.loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading embedding model...</p>
              <p className="text-sm text-gray-500">This may take a minute on first load.</p>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Milestone 4: Jina Reader & Crawling System Test</p>
        </div>
      </div>
    </div>
  )
}

export default App
