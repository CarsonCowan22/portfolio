/**
 * Accounts excluded from every budget view and total (Overview, Review, Transactions) while
 * their historical transactions/statements stay in the database untouched -- reversible by
 * simply removing an entry here, no data was deleted.
 */
export const ARCHIVED_ACCOUNTS: readonly string[] = ['360 Checking', '360 Performance Savings'];
