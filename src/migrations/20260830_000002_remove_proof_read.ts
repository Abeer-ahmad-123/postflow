import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "posts" SET "status" = 'review' WHERE "status" = 'proof_read';
  UPDATE "post_actions" SET "action" = 'review' WHERE "action" = 'proof_read';
  
  ALTER TABLE "posts" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "posts" ALTER COLUMN "status" TYPE text USING "status"::text;
  DROP TYPE "public"."enum_posts_status";
  CREATE TYPE "public"."enum_posts_status" AS ENUM('open', 'review', 'ready', 'posted', 'declined');
  ALTER TABLE "posts" ALTER COLUMN "status" TYPE "public"."enum_posts_status" USING "status"::"public"."enum_posts_status";
  ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'open';
  
  ALTER TABLE "post_actions" ALTER COLUMN "action" TYPE text USING "action"::text;
  DROP TYPE "public"."enum_post_actions_action";
  CREATE TYPE "public"."enum_post_actions_action" AS ENUM('open', 'review', 'ready', 'posted', 'declined');
  ALTER TABLE "post_actions" ALTER COLUMN "action" TYPE "public"."enum_post_actions_action" USING "action"::"public"."enum_post_actions_action";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "posts" ALTER COLUMN "status" TYPE text USING "status"::text;
  DROP TYPE "public"."enum_posts_status";
  CREATE TYPE "public"."enum_posts_status" AS ENUM('open', 'review', 'proof_read', 'ready', 'posted', 'declined');
  ALTER TABLE "posts" ALTER COLUMN "status" TYPE "public"."enum_posts_status" USING "status"::"public"."enum_posts_status";
  ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'open';
  
  ALTER TABLE "post_actions" ALTER COLUMN "action" TYPE text USING "action"::text;
  DROP TYPE "public"."enum_post_actions_action";
  CREATE TYPE "public"."enum_post_actions_action" AS ENUM('open', 'review', 'proof_read', 'ready', 'posted', 'declined');
  ALTER TABLE "post_actions" ALTER COLUMN "action" TYPE "public"."enum_post_actions_action" USING "action"::"public"."enum_post_actions_action";`)
}
