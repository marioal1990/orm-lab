import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTelefono1794528936126 implements MigrationInterface {
    name = 'AddTelefono1794528936126'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cliente" ADD "telefono" character varying(20)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cliente" DROP COLUMN "telefono"`);
    }

}
