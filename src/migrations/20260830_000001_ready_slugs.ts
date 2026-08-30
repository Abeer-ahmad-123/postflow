import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_posts_status" ADD VALUE IF NOT EXISTS 'ready';
  ALTER TYPE "public"."enum_post_actions_action" ADD VALUE IF NOT EXISTS 'ready';
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "slug" varchar;
  
  WITH base_slugs AS (
  	SELECT
  		"id",
  		COALESCE(
  			NULLIF(
  				REGEXP_REPLACE(
  					REGEXP_REPLACE(LOWER(TRIM("topic_name")), '[^a-z0-9]+', '-', 'g'),
  					'^-|-$',
  					'',
  					'g'
  				),
  				''
  			),
  			'post'
  		) AS "base_slug"
  	FROM "posts"
  ),
  numbered_slugs AS (
  	SELECT
  		"id",
  		"base_slug",
  		ROW_NUMBER() OVER (PARTITION BY "base_slug" ORDER BY "id") AS "slug_index"
  	FROM base_slugs
  )
  UPDATE "posts"
  SET "slug" = CASE
  	WHEN numbered_slugs."slug_index" = 1 THEN numbered_slugs."base_slug"
  	ELSE numbered_slugs."base_slug" || '-' || numbered_slugs."slug_index"
  END
  FROM numbered_slugs
  WHERE "posts"."id" = numbered_slugs."id"
  	AND ("posts"."slug" IS NULL OR "posts"."slug" = '');
  
  UPDATE "posts"
  SET "slug" = 'post-' || "id"
  WHERE "slug" IS NULL OR "slug" = '';
  
  ALTER TABLE "posts" ALTER COLUMN "slug" SET NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS "posts_slug_idx" ON "posts" USING btree ("slug");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "posts_slug_idx";
  ALTER TABLE "posts" DROP COLUMN IF EXISTS "slug";
  
  ALTER TABLE "posts" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "posts" ALTER COLUMN "status" TYPE text USING "status"::text;
  UPDATE "posts" SET "status" = 'posted' WHERE "status" = 'ready';
  DROP TYPE "public"."enum_posts_status";
  CREATE TYPE "public"."enum_posts_status" AS ENUM('open', 'review', 'proof_read', 'posted', 'declined');
  ALTER TABLE "posts" ALTER COLUMN "status" TYPE "public"."enum_posts_status" USING "status"::"public"."enum_posts_status";
  ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'open';
  
  ALTER TABLE "post_actions" ALTER COLUMN "action" TYPE text USING "action"::text;
  UPDATE "post_actions" SET "action" = 'posted' WHERE "action" = 'ready';
  DROP TYPE "public"."enum_post_actions_action";
  CREATE TYPE "public"."enum_post_actions_action" AS ENUM('open', 'review', 'proof_read', 'posted', 'declined');
  ALTER TABLE "post_actions" ALTER COLUMN "action" TYPE "public"."enum_post_actions_action" USING "action"::"public"."enum_post_actions_action";`)
}
