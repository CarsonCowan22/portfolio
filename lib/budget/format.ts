/** TypeORM's 'date' column type can come back as either a string or a Date depending on driver
 * config -- normalize defensively wherever an entity's date field is read for display. */
export function toDateString(value: unknown): string {
  return typeof value === 'string' ? value : new Date(value as string).toISOString().slice(0, 10);
}
