import type { CrawlProgress, Document } from '@/types'

interface CrawlProgressProps {
  progress: CrawlProgress
  document: Document | null
  onReset: () => void
}

// Component for displaying crawl progress and results
export function CrawlProgressDisplay({ progress, document, onReset }: CrawlProgressProps) {
  const { status, discovered, processed, failed, chunksCreated, message, currentUrl, failedUrls, discoveredUrls } = progress

  // Calculate progress percentage
  const progressPercent = discovered > 0 ? (processed / discovered) * 100 : 0

  // Status badge styles
  const statusConfig: Record<typeof status, { bg: string; border: string; text: string }> = {
    idle: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-600' },
    checking: { bg: 'bg-teal-light', border: 'border-teal', text: 'text-teal' },
    crawling: { bg: 'bg-amber-light', border: 'border-amber', text: 'text-amber' },
    completed: { bg: 'bg-green-50', border: 'border-green-600', text: 'text-green-700' },
    error: { bg: 'bg-red-50', border: 'border-red-600', text: 'text-red-700' },
  }

  const config = statusConfig[status]

  return (
    <div className="library-card fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-semibold text-ink mb-2">
            Crawl Progress
          </h2>
          <span className={`status-badge ${config.bg} ${config.border} ${config.text}`}>
            {status === 'idle' && 'Idle'}
            {status === 'checking' && '• Checking'}
            {status === 'crawling' && '• Crawling'}
            {status === 'completed' && '✓ Completed'}
            {status === 'error' && '✗ Error'}
          </span>
        </div>

        <button
          onClick={onReset}
          className="btn btn-secondary text-sm px-4 py-2"
        >
          Reset
        </button>
      </div>

      {/* Progress Message */}
      {message && (
        <div className="mb-4 p-3 bg-parchment-dark/50 rounded-lg border border-border">
          <p className="text-sm text-ink">{message}</p>
        </div>
      )}

      {/* Current URL */}
      {currentUrl && status === 'crawling' && (
        <div className="mb-4 flex items-center gap-2 text-xs text-ink-light">
          <span className="font-medium">Processing:</span>
          <span className="mono truncate flex-1">{currentUrl}</span>
        </div>
      )}

      {/* Progress Bar */}
      {status === 'crawling' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink">
              {processed} / {discovered} pages
            </span>
            <span className="text-sm text-ink-light">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card text-teal">
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">
              Discovered
            </p>
            <p className="text-3xl font-bold">{discovered}</p>
          </div>
        </div>

        <div className="stat-card text-amber">
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">
              Processed
            </p>
            <p className="text-3xl font-bold">{processed}</p>
          </div>
        </div>

        <div className="stat-card text-purple-600">
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">
              Chunks
            </p>
            <p className="text-3xl font-bold">{chunksCreated}</p>
          </div>
        </div>

        <div className="stat-card text-red-600">
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">
              Failed
            </p>
            <p className="text-3xl font-bold">{failed}</p>
          </div>
        </div>
      </div>

      {/* Document Info */}
      {document && (
        <div className="mb-6 p-4 bg-parchment-dark/30 rounded-lg border-2 border-border">
          <h3 className="text-sm font-semibold text-ink mb-3 uppercase tracking-wide">
            Document Information
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-ink-light mb-1">Document ID</p>
              <p className="text-xs mono text-ink/80 break-all">{document.id}</p>
            </div>
            <div>
              <p className="text-xs text-ink-light mb-1">Document Key</p>
              <p className="text-sm font-medium text-ink">{document.document_key}</p>
            </div>
          </div>
        </div>
      )}

      {/* Discovered URLs Catalog */}
      {discoveredUrls && discoveredUrls.length > 0 && (
        <details className="mb-6 catalog-drawer group" open={status === 'crawling'}>
          <summary className="catalog-drawer-label">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 transition-transform duration-300 group-open:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-ink">
                  Page Catalog
                </h3>
                <p className="text-xs text-ink-light mt-0.5">
                  {discoveredUrls.length} pages discovered
                </p>
              </div>
            </div>
          </summary>

          <div className="catalog-drawer-content">
            <div className="catalog-cards">
              {discoveredUrls.slice(0, 50).map((url, idx) => (
                <div
                  key={url}
                  className="catalog-card"
                  style={{
                    animationDelay: `${Math.min(idx * 50, 1000)}ms`,
                  }}
                >
                  <div className="catalog-card-header">
                    <span className="catalog-card-number">
                      {String(idx + 1).padStart(3, '0')}
                    </span>
                    <div className="catalog-card-status">
                      {idx < processed ? (
                        <span className="status-processed">✓</span>
                      ) : (
                        <span className="status-pending">◦</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="catalog-card-url"
                    title={url}
                  >
                    {url}
                  </a>
                </div>
              ))}
              {discoveredUrls.length > 50 && (
                <div className="catalog-card catalog-card-overflow">
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber mb-1">
                        +{discoveredUrls.length - 50}
                      </p>
                      <p className="text-xs text-ink-light uppercase tracking-wide">
                        More Pages
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </details>
      )}

      {/* Failed URLs */}
      {failedUrls && failedUrls.length > 0 && (
        <details className="p-4 bg-red-50/50 rounded-lg border-2 border-red-200">
          <summary className="cursor-pointer font-medium text-red-900 flex items-center gap-2 hover:text-red-700 transition-colors">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Failed URLs ({failedUrls.length})
          </summary>
          <ul className="mt-4 space-y-3 max-h-64 overflow-y-auto">
            {failedUrls.slice(0, 10).map((item, idx) => (
              <li
                key={idx}
                className="text-xs p-3 bg-white rounded border border-red-200"
              >
                <p className="mono text-red-700 mb-1 break-all">
                  {item.url}
                </p>
                <p className="text-red-600 italic">
                  {item.error}
                </p>
              </li>
            ))}
            {failedUrls.length > 10 && (
              <li className="text-xs text-red-600 text-center py-2">
                ... and {failedUrls.length - 10} more
              </li>
            )}
          </ul>
        </details>
      )}
    </div>
  )
}
