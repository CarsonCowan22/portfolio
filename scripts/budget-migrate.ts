import './budgetLoadEnv';
import { AppDataSource } from '../lib/budget/dataSource';

async function main() {
  const dataSource = await AppDataSource.initialize();
  const executed = await dataSource.runMigrations();
  if (executed.length === 0) {
    console.log('No pending migrations.');
  } else {
    for (const migration of executed) {
      console.log(`Applied migration: ${migration.name}`);
    }
  }
  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
