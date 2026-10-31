import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFarmIdToUsers1716480000002 implements MigrationInterface {
    name = 'AddFarmIdToUsers1716480000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add farm_id column to users table
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN IF NOT EXISTS "farm_id" UUID NULL
        `);

        // Add foreign key constraint for farm_id
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_farm_id'
                ) THEN
                    ALTER TABLE "users" 
                    ADD CONSTRAINT "fk_users_farm_id" 
                    FOREIGN KEY ("farm_id") 
                    REFERENCES "farms"("id") 
                    ON DELETE SET NULL;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP CONSTRAINT IF EXISTS "fk_users_farm_id"
        `);

        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "farm_id"
        `);
    }
}
