-- Create files table
CREATE TABLE IF NOT EXISTS "files" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "file_type" VARCHAR(255) NOT NULL,
  "size" INTEGER NOT NULL,
  "url" VARCHAR(500) NOT NULL,
  "storage_path" VARCHAR(500) NOT NULL,
  "storage_provider" VARCHAR(50) NOT NULL,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
); 