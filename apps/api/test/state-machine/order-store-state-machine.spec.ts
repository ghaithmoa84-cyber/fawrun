import { describe, it, expect } from 'vitest';
import { OrderStoreStateMachine } from '../../src/state-machine/order-store-state-machine.js';
import { ORDER_STORE_TRANSITIONS } from '../../src/state-machine/order-transitions.js';

describe('OrderStoreStateMachine', () => {
  const sm = new OrderStoreStateMachine(ORDER_STORE_TRANSITIONS);

  describe('canTransition — allowed transitions', () => {
    it('allows PENDING → PURCHASED by RUNNER', () => {
      expect(sm.canTransition('PENDING', 'PURCHASED', 'RUNNER')).toBe(true);
    });

    it('allows PENDING → SKIPPED by RUNNER', () => {
      expect(sm.canTransition('PENDING', 'SKIPPED', 'RUNNER')).toBe(true);
    });

    it('returns valid TransitionResult on transition()', () => {
      const result = sm.transition('PENDING', 'PURCHASED', 'RUNNER');
      expect(result).toEqual({
        from: 'PENDING',
        to: 'PURCHASED',
        actor: 'RUNNER',
        description: 'Runner confirms purchase at store',
      });
    });
  });

  describe('canTransition — forbidden transitions', () => {
    it('rejects PURCHASED → anything (terminal)', () => {
      expect(sm.canTransition('PURCHASED', 'PENDING', 'RUNNER')).toBe(false);
      expect(sm.canTransition('PURCHASED', 'SKIPPED', 'RUNNER')).toBe(false);
    });

    it('rejects SKIPPED → anything (terminal)', () => {
      expect(sm.canTransition('SKIPPED', 'PENDING', 'RUNNER')).toBe(false);
      expect(sm.canTransition('SKIPPED', 'PURCHASED', 'RUNNER')).toBe(false);
    });

    it('rejects customer actor (only RUNNER/SYSTEM allowed)', () => {
      expect(sm.canTransition('PENDING', 'PURCHASED', 'CUSTOMER' as any)).toBe(false);
      expect(sm.canTransition('PENDING', 'SKIPPED', 'CUSTOMER' as any)).toBe(false);
    });

    it('rejects invalid target from PENDING', () => {
      expect(sm.canTransition('PENDING', 'DELIVERED' as any, 'RUNNER')).toBe(false);
    });

    it('throws 422 on transition() for forbidden move', () => {
      expect(() => sm.transition('PURCHASED', 'PENDING', 'RUNNER')).toThrow(
        expect.objectContaining({ status: 422 }),
      );
    });

    it('throws 422 when transitioning from terminal state', () => {
      expect(() => sm.transition('SKIPPED', 'PENDING', 'RUNNER')).toThrow(
        expect.objectContaining({ status: 422 }),
      );
    });
  });

  describe('isTerminal', () => {
    it('returns true for PURCHASED and SKIPPED', () => {
      expect(sm.isTerminal('PURCHASED')).toBe(true);
      expect(sm.isTerminal('SKIPPED')).toBe(true);
    });

    it('returns false for PENDING', () => {
      expect(sm.isTerminal('PENDING')).toBe(false);
    });
  });

  describe('assertNotTerminal', () => {
    it('does not throw for PENDING', () => {
      expect(() => sm.assertNotTerminal('PENDING')).not.toThrow();
    });

    it('throws 422 for terminal states', () => {
      expect(() => sm.assertNotTerminal('PURCHASED')).toThrow(
        expect.objectContaining({ status: 422 }),
      );
    });
  });

  describe('transition table integrity', () => {
    it('defines exactly 2 allowed store transitions', () => {
      expect(ORDER_STORE_TRANSITIONS).toHaveLength(2);
    });

    it('covers all 3 OrderStoreStatus values', () => {
      const statuses = new Set();
      for (const t of ORDER_STORE_TRANSITIONS) {
        statuses.add(t.from);
        statuses.add(t.to);
      }
      expect(statuses.size).toBe(3);
    });
  });
});