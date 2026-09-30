// ============================================================================
// RESTOia / KOBE — Money Primitive Helper (Zero Floats)
// ============================================================================

/**
 * Convierte un monto en pesos ($) a centavos enteros (BigInt).
 * @param {number|string|bigint} val 
 * @returns {bigint}
 */
export function toCents(val) {
  if (typeof val === 'bigint') return val;
  const num = Number(val) || 0;
  return BigInt(Math.round(num * 100));
}

/**
 * Convierte centavos enteros (BigInt o number) a formato de moneda ($ AR).
 * @param {bigint|number} cents 
 * @returns {string}
 */
export function formatCurrencyFromCents(cents) {
  const num = Number(cents) / 100;
  return `$${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Formateador de monto regular ($).
 * @param {number} amount 
 * @returns {string}
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `$${num.toLocaleString('es-AR')}`;
}
