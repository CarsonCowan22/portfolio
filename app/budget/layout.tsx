import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { template: '%s | Budget', default: 'Budget' },
  robots: { index: false, follow: false },
};

export default function BudgetRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
