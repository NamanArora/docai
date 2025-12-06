interface UrlInputProps {
  url: string
  onUrlChange: (url: string) => void
  onStartCrawl: () => void
  onForceReindex: () => void
  disabled?: boolean
  isLoading?: boolean
  documentExists?: boolean
}

// Component for URL input and crawl initiation
export function UrlInput({
  url,
  onUrlChange,
  onStartCrawl,
  onForceReindex,
  disabled = false,
  isLoading = false,
  documentExists = false
}: UrlInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim() && !disabled) {
      onStartCrawl()
    }
  }

  return (
    <div className="library-card fade-in">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-ink mb-2">
          Index Documentation
        </h2>
        <p className="text-ink-light">
          Enter a documentation URL to begin crawling and indexing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="doc-url"
            className="block text-sm font-medium text-ink mb-2"
          >
            Documentation URL
          </label>
          <input
            id="doc-url"
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            className="input-field"
            placeholder="https://docs.example.com"
            disabled={disabled}
            required
          />
          <p className="mt-2 text-xs text-ink-light/70 italic">
            Supported: Static documentation sites (Stripe, Next.js, etc.)
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled || !url.trim() || isLoading}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Start Indexing
                </>
              )}
            </span>
          </button>

          {/* Force Reindex Button */}
          {documentExists && (
            <button
              type="button"
              onClick={onForceReindex}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled || !url.trim() || isLoading}
              title="Delete and re-index this documentation"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Force Reindex
              </span>
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 p-4 bg-amber-light/30 border-l-4 border-amber rounded-r">
        <p className="text-xs text-ink-light leading-relaxed">
          <strong className="text-ink">Note:</strong> The crawler will process up to 100 pages,
          respecting the same domain and path prefix. Embeddings are generated
          client-side using your browser.
        </p>
      </div>
    </div>
  )
}
