CREATE TABLE IF NOT EXISTS site_settings (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, body text NOT NULL,
 excerpt text NOT NULL DEFAULT '', topic text NOT NULL DEFAULT 'Alltag', photos jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')), version integer NOT NULL DEFAULT 1,
 example boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);
CREATE INDEX IF NOT EXISTS entries_published ON entries(published_at DESC) WHERE status='published';
CREATE TABLE IF NOT EXISTS comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
 user_id text NOT NULL, author_name text NOT NULL, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_entry ON comments(entry_id,created_at);
CREATE TABLE IF NOT EXISTS corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
 user_id text NOT NULL, author_name text NOT NULL, quote text NOT NULL, replacement text NOT NULL,
 reason text NOT NULL DEFAULT '', start_offset integer NOT NULL CHECK(start_offset>=0),
 end_offset integer NOT NULL CHECK(end_offset>start_offset), base_version integer NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS corrections_entry ON corrections(entry_id,created_at);
CREATE TABLE IF NOT EXISTS revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
 title text NOT NULL, body text NOT NULL, version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(entry_id,version)
);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
