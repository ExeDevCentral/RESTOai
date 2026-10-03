import { describe, it, expect } from 'vitest';
import { formatStatus, posView } from './posView.js';

describe('posView Lifecycle & Status Formatting', () => {
  it('formats table statuses cleanly without childish emojis', () => {
    expect(formatStatus('libre')).toBe('Libre');
    expect(formatStatus('ocupada')).toBe('Ocupada');
    expect(formatStatus('cuenta_pedida')).toBe('Cuenta Pedida');
    expect(formatStatus('reservada')).toBe('Reservada');
    expect(formatStatus('desconocido')).toBe('desconocido');
  });

  it('implements view lifecycle contract (render, mount, cleanup)', () => {
    expect(typeof posView.render).toBe('function');
    expect(typeof posView.mount).toBe('function');
    expect(typeof posView.cleanup).toBe('function');
  });
});
