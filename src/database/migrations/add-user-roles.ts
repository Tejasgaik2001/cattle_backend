import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoles1716480000000 implements MigrationInterface {
    name = 'AddUserRoles1716480000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            ADD COLUMN "global_role" VARCHAR(20) DEFAULT 'worker',
            ADD COLUMN "is_active" BOOLEAN DEFAULT true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" 
            DROP COLUMN "global_role",
            DROP COLUMN "is_active"
        `);
    }
}
