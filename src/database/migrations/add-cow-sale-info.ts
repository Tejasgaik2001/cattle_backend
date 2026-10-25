import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCowSaleInfo1716480000003 implements MigrationInterface {
    name = 'AddCowSaleInfo1716480000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add sale information columns to cows table
        await queryRunner.query(`
            ALTER TABLE "cows" 
            ADD COLUMN "sold_to" VARCHAR(255) NULL,
            ADD COLUMN "sold_price" DECIMAL(10,2) NULL,
            ADD COLUMN "sold_date" DATE NULL,
            ADD COLUMN "sold_description" TEXT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        await queryRunner.query(`
            ALTER TABLE "cows" 
            DROP COLUMN IF EXISTS "sold_to",
            DROP COLUMN IF EXISTS "sold_price",
            DROP COLUMN IF EXISTS "sold_date",
            DROP COLUMN IF EXISTS "sold_description"
        `);
    }
}
