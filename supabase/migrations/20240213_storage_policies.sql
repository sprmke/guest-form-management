-- Legacy migration version: some environments applied this when `storage.objects`
-- already existed. On a fresh local stack, user migrations can run before Storage
-- initializes that table, so policy DDL lives in `20250213045323_create_storage_buckets.sql`
-- (runs after buckets are created and `storage.objects` exists).
SELECT 1;
