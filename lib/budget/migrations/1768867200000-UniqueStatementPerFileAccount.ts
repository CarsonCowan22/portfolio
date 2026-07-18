import { MigrationInterface, QueryRunner } from 'typeorm';

/** Re-ingesting the same statement PDF must update its Statement row, not duplicate it --
 * matching how transactions are already upserted by a stable id. */
export class UniqueStatementPerFileAccount1768867200000 implements MigrationInterface {
  name = 'UniqueStatementPerFileAccount1768867200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "statements" ADD CONSTRAINT "uq_statements_source_file_account" UNIQUE ("source_file", "account")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "statements" DROP CONSTRAINT "uq_statements_source_file_account"`);
  }
}
