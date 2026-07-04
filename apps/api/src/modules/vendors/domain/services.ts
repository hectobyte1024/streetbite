/**
 * Generate a URL-friendly slug from a vendor name.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Validate price level is within acceptable range.
 */
export function validatePriceLevel(priceLevel: number | null | undefined): boolean {
  if (priceLevel === null || priceLevel === undefined) {
    return true;
  }
  return priceLevel >= 1 && priceLevel <= 5;
}
