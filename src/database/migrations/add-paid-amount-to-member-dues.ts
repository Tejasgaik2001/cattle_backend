import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaidAmountToMemberDues1716480000005 implements MigrationInterface {
    name = 'AddPaidAmountToMemberDues1716480000005';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add paid_amount column to member_dues table
        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            ADD COLUMN "paid_amount" DECIMAL(12,2) DEFAULT 0
        `);
        
        // Update the status enum to include PARTIALLY_PAID
        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            ALTER COLUMN "status" TYPE VARCHAR(50)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            DROP COLUMN IF EXISTS "paid_amount"
        `);
        
        // Revert status enum
        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            ALTER COLUMN "status" TYPE VARCHAR(50)
        `);
    }
}
