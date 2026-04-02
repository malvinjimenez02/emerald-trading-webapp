/**
 * Cleans a string by removing commas and converting it to a valid float.
 * Useful for handling currency/price inputs that may include thousands-separators.
 * e.g., "23,973.50" -> 23973.5
 */
export const parsePrice = (val: string | number | null | undefined): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

/**
 * Same as parsePrice but returns NaN instead of null if invalid.
 * Used for legacy code compatibility where parseFloat(input || '') was used.
 */
export const cleanParse = (val: string | number | null | undefined): number => {
  const result = parsePrice(val);
  return result === null ? NaN : result;
};
