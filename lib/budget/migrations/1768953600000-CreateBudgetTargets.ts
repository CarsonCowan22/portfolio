import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBudgetTargets1768953600000 implements MigrationInterface {
  name = 'CreateBudgetTargets1768953600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "budget_targets" (
        "id" SERIAL PRIMARY KEY,
        "category" text NOT NULL,
        "monthly_target" numeric(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_budget_targets_category" UNIQUE ("category")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "budget_targets"`);
  }
}
