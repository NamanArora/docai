import { useState } from 'react'
import { useEmbeddings } from './hooks/useEmbeddings'
import { generateEmbedding } from './lib/embeddings'

function App() {
  const { status, isSupported, initialize } = useEmbeddings()
  const [testText, setTestText] = useState('Hello, world!')
  const [embedding, setEmbedding] = useState<number[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
                <span className={`font-medium ${status.loading ? 'text-blue-600' : 'text-gray-400'}`}>
                  {status.loading ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Loaded:</span>
                <span className={`font-medium ${status.loaded ? 'text-green-600' : 'text-gray-400'}`}>
                  {status.loaded ? 'Yes' : 'No'}
                </span>
              </div>
              {status.error && (
                <div className="text-sm text-red-600">
                  Error: {status.error.message}
                </div>
              )}
            </div>
          </div>

          {/* Initialize Button */}
          {!status.loaded && !status.loading && isSupported && (
            <button
              onClick={initialize}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mb-4"
            >
              Initialize Model
            </button>
          )}

          {/* Test Input */}
          {status.loaded && (
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
          {status.loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading embedding model...</p>
              <p className="text-sm text-gray-500">This may take a minute on first load.</p>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Milestone 3: Client-Side Embeddings Test</p>
        </div>
      </div>
    </div>
  )
}

export default App
