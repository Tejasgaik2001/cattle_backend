import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoles1716480000000 implements MigrationInterface {
    name = 'AddUserRoles1716480000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Columns already exist from synchronize, skip
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN IF EXISTS "global_role",
            DROP COLUMN IF EXISTS "is_active"
        `);
    }
}
