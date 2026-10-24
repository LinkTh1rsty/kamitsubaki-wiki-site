-- Dedicated ARCHIVE_DB binding. Never apply to the account/gallery database.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS archive_profiles (
 owner TEXT PRIMARY KEY, public_id TEXT UNIQUE NOT NULL, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS archive_collections (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('collection','exhibition')),
 items TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','pending','published','rejected')),
 revision INTEGER NOT NULL DEFAULT 1, forked_from TEXT, reviewer TEXT, review_note TEXT,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS archive_collections_public ON archive_collections(status,updated_at);
CREATE INDEX IF NOT EXISTS archive_collections_owner ON archive_collections(owner);
CREATE TABLE IF NOT EXISTS archive_follows (
 owner TEXT NOT NULL, collection_id TEXT NOT NULL REFERENCES archive_collections(id) ON DELETE CASCADE,
 PRIMARY KEY(owner,collection_id)
);
CREATE TABLE IF NOT EXISTS archive_tasks (
 id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, field TEXT NOT NULL, locale TEXT NOT NULL,
 owner TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('claimed','submitted','approved','rejected')),
 snapshot TEXT NOT NULL, proof_url TEXT, reviewer TEXT, review_note TEXT, claimed_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS archive_tasks_owner ON archive_tasks(owner,status);
CREATE TABLE IF NOT EXISTS archive_rooms (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, position TEXT, revision INTEGER NOT NULL DEFAULT 1,
 ended INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS archive_room_members (
 room_id TEXT NOT NULL REFERENCES archive_rooms(id) ON DELETE CASCADE,
 owner TEXT NOT NULL, display_name TEXT NOT NULL, last_seen INTEGER NOT NULL,
 PRIMARY KEY(room_id,owner)
);
CREATE INDEX IF NOT EXISTS archive_room_presence ON archive_room_members(room_id,last_seen);
CREATE TABLE IF NOT EXISTS archive_audit (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL,
 revision INTEGER, note TEXT, created_at INTEGER NOT NULL
);
