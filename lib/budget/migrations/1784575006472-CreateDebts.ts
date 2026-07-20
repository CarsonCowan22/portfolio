import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDebts1784575006472 implements MigrationInterface {
  name = 'CreateDebts1784575006472';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "debts" (
        "id" SERIAL PRIMARY KEY,
        "creditor" text NOT NULL,
        "balance" numeric(12,2),
        "monthly_payment" numeric(12,2),
        "status" text NOT NULL,
        "notes" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "debt_payments" (
        "id" SERIAL PRIMARY KEY,
        "debt_id" integer NOT NULL,
        "due_date" date NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "paid" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_debt_payments_debt" FOREIGN KEY ("debt_id") REFERENCES "debts" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "debt_payments"`);
    await queryRunner.query(`DROP TABLE "debts"`);
  }
}
