import { MigrationInterface, QueryRunner } from 'typeorm';

/** A free-form, optional tag alongside `category` -- lets a category like "Peer Transfers
 * (Venmo/Cash)" be split into co-parenting vs. family-loan-repayment vs. personal spending
 * without inventing a whole new category per split. */
export class AddTransactionSubcategory1784575236232 implements MigrationInterface {
  name = 'AddTransactionSubcategory1784575236232';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" ADD COLUMN "subcategory" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "subcategory"`);
  }
}
