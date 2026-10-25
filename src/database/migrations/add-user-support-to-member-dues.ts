import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSupportToMemberDues1716480000001 implements MigrationInterface {
    name = 'AddUserSupportToMemberDues1716480000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add user_id column to member_dues table
        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            ADD COLUMN "user_id" UUID NULL
        `);

        // Add foreign key constraint for user_id
        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            ADD CONSTRAINT "fk_user_id" 
            FOREIGN KEY ("user_id") 
            REFERENCES "users"("id") 
            ON DELETE CASCADE
        `);

        // Make person_id nullable
        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            ALTER COLUMN "person_id" DROP NOT NULL
        `);

        // Remove foreign key constraint on paid_by_id in financial_transactions
        // to allow both Person and User IDs
        await queryRunner.query(`
            ALTER TABLE "financial_transactions" 
            DROP CONSTRAINT IF EXISTS "fk_paid_by_id"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        await queryRunner.query(`
            ALTER TABLE "financial_transactions" 
            ADD CONSTRAINT "fk_paid_by_id" 
            FOREIGN KEY ("paid_by_id") 
            REFERENCES "people"("id") 
            ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            ALTER COLUMN "person_id" SET NOT NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            DROP CONSTRAINT IF EXISTS "fk_user_id"
        `);

        await queryRunner.query(`
            ALTER TABLE "member_dues" 
            DROP COLUMN "user_id"
        `);
    }
}
