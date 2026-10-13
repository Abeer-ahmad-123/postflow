import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "_key" varchar;
  ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT '';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN "_key";
  ALTER TABLE "media" DROP COLUMN "prefix";`)
}
