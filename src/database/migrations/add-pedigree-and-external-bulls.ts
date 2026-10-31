import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPedigreeAndExternalBulls1716480000006 implements MigrationInterface {
    name = 'AddPedigreeAndExternalBulls1716480000006';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create external_bulls table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "external_bulls" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "farm_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "registration_no" character varying NOT NULL,
                "breed" character varying,
                "source" character varying,
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" uuid,
                CONSTRAINT "PK_external_bulls_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_external_bulls_farm" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE
            )
        `);

        // Index on farm_id and registration_no
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_external_bulls_farm_reg" ON "external_bulls" ("farm_id", "registration_no")
        `);

        // 2. Add pedigree columns to cows table
        await queryRunner.query(`
            ALTER TABLE "cows"
            ADD COLUMN IF NOT EXISTS "sire_id" uuid,
            ADD COLUMN IF NOT EXISTS "external_sire_id" uuid,
            ADD COLUMN IF NOT EXISTS "breeding_method" character varying,
            ADD COLUMN IF NOT EXISTS "born_on_farm" boolean NOT NULL DEFAULT true
        `);

        // 3. Add foreign keys
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'FK_cows_sire'
                ) THEN
                    ALTER TABLE "cows"
                    ADD CONSTRAINT "FK_cows_sire" FOREIGN KEY ("sire_id") REFERENCES "cows"("id") ON DELETE SET NULL;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'FK_cows_external_sire'
                ) THEN
                    ALTER TABLE "cows"
                    ADD CONSTRAINT "FK_cows_external_sire" FOREIGN KEY ("external_sire_id") REFERENCES "external_bulls"("id") ON DELETE SET NULL;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "cows"
            DROP CONSTRAINT IF EXISTS "FK_cows_external_sire",
            DROP CONSTRAINT IF EXISTS "FK_cows_sire",
            DROP COLUMN IF EXISTS "born_on_farm",
            DROP COLUMN IF EXISTS "breeding_method",
            DROP COLUMN IF EXISTS "external_sire_id",
            DROP COLUMN IF EXISTS "sire_id"
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS "external_bulls"
        `);
    }
}
