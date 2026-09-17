export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

/**
 * Safely serializes a value for embedding inside a <script type="application/ld+json">
 * tag. Admin-editable fields (product name/description, etc.) can end up in this
 * data, so `<` is escaped to prevent a "</script>" sequence from breaking out of
 * the tag and injecting markup.
 */
export function toSafeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
