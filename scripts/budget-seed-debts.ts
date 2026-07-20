import './budgetLoadEnv';
import fs from 'node:fs';
import path from 'node:path';
import { getBudgetDataSource } from '../lib/budget/dataSource';
import type { Debt } from '../lib/budget/entities/Debt';
import type { DebtPayment } from '../lib/budget/entities/DebtPayment';

interface SeedDebt {
  creditor: string;
  balance: string | null;
  monthlyPayment: string | null;
  status: string;
  notes: string | null;
  payments: { dueDate: string; amount: string }[];
}

async function main() {
  const seedPath = path.resolve(process.cwd(), 'data/budget/seed-debts.json');
  const seedDebts: SeedDebt[] = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  const dataSource = await getBudgetDataSource();
  const debtRepo = dataSource.getRepository<Debt>('Debt');
  const paymentRepo = dataSource.getRepository<DebtPayment>('DebtPayment');

  for (const seed of seedDebts) {
    // Matched by creditor name -- re-running this script updates the known state and replaces
    // that creditor's payment schedule from scratch, rather than accumulating duplicates.
    let debt = await debtRepo.findOne({ where: { creditor: seed.creditor } });
    if (debt) {
      await debtRepo.update(debt.id, {
        balance: seed.balance,
        monthlyPayment: seed.monthlyPayment,
        status: seed.status,
        notes: seed.notes,
      });
    } else {
      debt = await debtRepo.save(
        debtRepo.create({
          creditor: seed.creditor,
          balance: seed.balance,
          monthlyPayment: seed.monthlyPayment,
          status: seed.status,
          notes: seed.notes,
        }),
      );
    }

    await paymentRepo.delete({ debt: { id: debt.id } });
    if (seed.payments.length > 0) {
      await paymentRepo.save(
        seed.payments.map((p) => paymentRepo.create({ debt: { id: debt!.id } as Debt, dueDate: p.dueDate, amount: p.amount })),
      );
    }
  }

  console.log(`Seeded ${seedDebts.length} debt(s).`);
  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
