export function normalizeSalesHistory(history) {
  if (!Array.isArray(history)) return [];

  return history.flatMap(entry => {
    const label = String(entry.time ?? entry.date ?? '').trim();
    const amount = Number(entry.amount ?? entry.totalSales);
    return label && Number.isFinite(amount) ? [{ label, amount }] : [];
  });
}