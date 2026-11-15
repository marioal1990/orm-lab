import type { MigrationInterface, QueryRunner } from "typeorm";

export class Init1794525846572 implements MigrationInterface {
    name = 'Init1794525846572'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "pedido" ("id" SERIAL NOT NULL, "total" numeric(10,2) NOT NULL, "creadoEn" TIMESTAMP NOT NULL DEFAULT now(), "clienteId" integer, CONSTRAINT "PK_af8d8b3d07fae559c37f56b3f43" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cliente" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "nombre" character varying NOT NULL, CONSTRAINT "UQ_503f81286c5e49acd6a832abf43" UNIQUE ("email"), CONSTRAINT "PK_18990e8df6cf7fe71b9dc0f5f39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "pedido" ADD CONSTRAINT "FK_2730a0c3947641edf256551f10c" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pedido" DROP CONSTRAINT "FK_2730a0c3947641edf256551f10c"`);
        await queryRunner.query(`DROP TABLE "cliente"`);
        await queryRunner.query(`DROP TABLE "pedido"`);
    }

}
