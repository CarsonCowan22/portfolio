import 'reflect-metadata';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { BudgetTargetEntity } from './entities/BudgetTarget';
import { CategoryRuleEntity } from './entities/CategoryRule';
import { DebtEntity } from './entities/Debt';
import { DebtPaymentEntity } from './entities/DebtPayment';
import { StatementEntity } from './entities/Statement';
import { TransactionEntity } from './entities/Transaction';

/**
 * Single shared DataSource, exported for the TypeORM migration CLI (`budget:migration:generate`)
 * and for scripts (`budget:migrate`, `budget:seed-rules`, `budget:ingest`) run via tsx.
 *
 * `synchronize` is always false -- schema changes only ever happen through a reviewed migration,
 * never an auto-sync, since this holds real financial data.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [TransactionEntity, CategoryRuleEntity, StatementEntity, BudgetTargetEntity, DebtEntity, DebtPaymentEntity],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
});

/**
 * Cached across Next.js dev hot-reloads and warm serverless invocations so we don't open a new
 * Postgres connection pool on every request (the same reasoning as the standard Prisma-on-Next
 * singleton pattern).
 */
declare global {
  // eslint-disable-next-line no-var
  var __budgetDataSourcePromise: Promise<DataSource> | undefined;
}

export function getBudgetDataSource(): Promise<DataSource> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set -- see .env.example');
  }
  if (!global.__budgetDataSourcePromise) {
    global.__budgetDataSourcePromise = AppDataSource.initialize();
  }
  return global.__budgetDataSourcePromise;
}
