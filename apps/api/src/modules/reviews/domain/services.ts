/**
 * Validate a star rating is within 1-5 range.
 */
export function validateRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Validate review body text is not excessively long.
 */
export function validateReviewBody(body: string | undefined | null): boolean {
  if (!body) return true;
  return body.length > 0 && body.length <= 1000;
}
