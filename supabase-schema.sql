-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key TEXT UNIQUE NOT NULL,
  root_url TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on document_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_documents_document_key ON documents(document_key);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Document sections table with vector embeddings
CREATE TABLE IF NOT EXISTS document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  heading TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  embedding vector(384) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups and vector search
CREATE INDEX IF NOT EXISTS idx_document_sections_document_id ON document_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_document_sections_url ON document_sections(url);

-- Create ivfflat index for vector similarity search (cosine distance)
-- Lists parameter: sqrt(row_count) is a good starting point
-- For 10,000 rows, lists=100 is reasonable
CREATE INDEX IF NOT EXISTS idx_document_sections_embedding
ON document_sections
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- RPC function for vector similarity search
-- Returns the top k most similar document sections based on cosine similarity
CREATE OR REPLACE FUNCTION match_sections(
  query_embedding vector(384),
  filter_document_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  url TEXT,
  heading TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_sections.id,
    document_sections.document_id,
    document_sections.url,
    document_sections.heading,
    document_sections.content,
    1 - (document_sections.embedding <=> query_embedding) AS similarity
  FROM document_sections
  WHERE document_sections.document_id = filter_document_id
    AND 1 - (document_sections.embedding <=> query_embedding) > 0.15
  ORDER BY document_sections.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Cleanup function to maintain free tier limits
-- Deletes oldest documents when total count exceeds 200
CREATE OR REPLACE FUNCTION cleanup_old_documents()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  total_docs INTEGER;
BEGIN
  -- Count total documents
  SELECT COUNT(*) INTO total_docs FROM documents;

  -- If more than 200 documents, delete oldest ones
  IF total_docs > 200 THEN
    DELETE FROM documents
    WHERE id IN (
      SELECT id
      FROM documents
      ORDER BY created_at ASC
      LIMIT (total_docs - 200)
    );
  END IF;
END;
$$;

-- Create a scheduled job to run cleanup daily (using pg_cron)
-- Note: pg_cron must be enabled in Supabase dashboard first
-- This can also be set up manually in the Supabase dashboard under Database > Cron Jobs
--
-- Example cron job (uncomment after enabling pg_cron):
-- SELECT cron.schedule(
--   'cleanup-old-documents',
--   '0 0 * * *', -- Run daily at midnight
--   'SELECT cleanup_old_documents();'
-- );

-- Grant permissions (adjust as needed based on your Supabase setup)
-- These ensure the anonymous role can read/write to the tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all documents and sections
CREATE POLICY "Allow public read access to documents"
  ON documents FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to documents"
  ON documents FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public read access to document_sections"
  ON document_sections FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to document_sections"
  ON document_sections FOR INSERT
  TO public
  WITH CHECK (true);
