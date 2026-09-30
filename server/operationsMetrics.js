const MINUTE_MS = 60_000;

export function recordOrderStatus(order, status, at = new Date().toISOString()) {
  if (!Array.isArray(order.statusHistory)) order.statusHistory = [];

  const lastEvent = order.statusHistory[order.statusHistory.length - 1];
  if (lastEvent?.status === status) return order.statusHistory;

  order.statusHistory.push({ status, at });
  return order.statusHistory;
}

function firstEventAt(history, status) {
  const event = history.find(entry => entry.status === status);
  const timestamp = event ? Date.parse(event.at) : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function summarizeMinutes(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  if (sorted.length === 0) {
    return { sampleSize: 0, medianMinutes: null, p90Minutes: null };
  }

  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  const p90 = sorted[Math.ceil(sorted.length * 0.9) - 1];
  const roundMinutes = value => Math.round(value * 10) / 10;

  return {
    sampleSize: sorted.length,
    medianMinutes: roundMinutes(median),
    p90Minutes: roundMinutes(p90)
  };
}

export function calculateServiceMetrics(orders) {
  const orderToReady = [];
  const readyToServed = [];

  for (const order of orders) {
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const submittedAt = firstEventAt(history, 'pendiente');
    const readyAt = firstEventAt(history, 'listo');
    const servedAt = firstEventAt(history, 'servido');

    if (submittedAt !== null && readyAt !== null && readyAt >= submittedAt) {
      orderToReady.push((readyAt - submittedAt) / MINUTE_MS);
    }

    if (readyAt !== null && servedAt !== null && servedAt >= readyAt) {
      readyToServed.push((servedAt - readyAt) / MINUTE_MS);
    }
  }

  return {
    orderToReady: summarizeMinutes(orderToReady),
    readyToServed: summarizeMinutes(readyToServed)
  };
}