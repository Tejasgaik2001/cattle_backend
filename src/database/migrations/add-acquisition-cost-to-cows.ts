import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcquisitionCostToCows1716480000004 implements MigrationInterface {
    name = 'AddAcquisitionCostToCows1716480000004';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add acquisition_cost column to cows table
        await queryRunner.query(`
            ALTER TABLE "cows" 
            ADD COLUMN "acquisition_cost" DECIMAL(10,2) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        await queryRunner.query(`
            ALTER TABLE "cows" 
            DROP COLUMN IF EXISTS "acquisition_cost"
        `);
    }
}
