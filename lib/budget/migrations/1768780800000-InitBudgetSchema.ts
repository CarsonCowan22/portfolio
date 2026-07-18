import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitBudgetSchema1768780800000 implements MigrationInterface {
  name = 'InitBudgetSchema1768780800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "category_rules" (
        "id" SERIAL PRIMARY KEY,
        "category" text NOT NULL,
        "match_type" varchar(16) NOT NULL,
        "pattern" text NOT NULL,
        "priority" int NOT NULL,
        "created_by" varchar(16) NOT NULL DEFAULT 'carson',
        "notes" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "statements" (
        "id" SERIAL PRIMARY KEY,
        "source_file" text NOT NULL,
        "account" text NOT NULL,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "opening_balance" numeric(12,2) NOT NULL,
        "closing_balance" numeric(12,2) NOT NULL,
        "reconciled" boolean NOT NULL DEFAULT false,
        "reconciliation_diff" numeric(12,2),
        "verified_by_human" boolean NOT NULL DEFAULT false,
        "override_reason" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" varchar(64) PRIMARY KEY,
        "source_file" text NOT NULL,
        "source_page" int NOT NULL,
        "account" text NOT NULL,
        "date" date NOT NULL,
        "description_raw" text NOT NULL,
        "description_clean" text NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "running_balance" numeric(12,2),
        "internal_transfer" boolean NOT NULL DEFAULT false,
        "category" text,
        "category_source" varchar(24),
        "category_rule_id" int REFERENCES "category_rules"("id") ON DELETE SET NULL,
        "suggested_category" text,
        "suggested_by" text,
        "needs_review" boolean NOT NULL DEFAULT true,
        "notes" text,
        "flagged_for_follow_up" boolean NOT NULL DEFAULT false,
        "statement_id" int REFERENCES "statements"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_transactions_needs_review" ON "transactions" ("needs_review")`);
    await queryRunner.query(`CREATE INDEX "idx_transactions_statement_id" ON "transactions" ("statement_id")`);
    await queryRunner.query(`CREATE INDEX "idx_transactions_account_date" ON "transactions" ("account", "date")`);
    await queryRunner.query(`CREATE INDEX "idx_category_rules_priority" ON "category_rules" ("priority")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "statements"`);
    await queryRunner.query(`DROP TABLE "category_rules"`);
  }
}
