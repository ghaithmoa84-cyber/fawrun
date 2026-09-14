import { describe, it, expect } from 'vitest';
import { RunnerStateMachine } from '../../src/state-machine/runner-state-machine.js';
import { RUNNER_TRANSITIONS } from '../../src/state-machine/runner-transitions.js';
import type { RunnerStatus, RunnerActor } from '../../src/state-machine/runner-transitions.js';

describe('RunnerStateMachine', () => {
  const sm = new RunnerStateMachine(RUNNER_TRANSITIONS);

  // ── Positive: every allowed transition must be accepted ──────────────
  describe('canTransition — allowed transitions', () => {
    const allowed: Array<[RunnerStatus, RunnerStatus, RunnerActor]> = [
      ['UNAVAILABLE', 'AVAILABLE', 'RUNNER'],
      ['UNAVAILABLE', 'AVAILABLE', 'ADMIN'],
      ['AVAILABLE', 'ON_MISSION', 'SYSTEM'],
      ['ON_MISSION', 'AVAILABLE', 'SYSTEM'],
      ['AVAILABLE', 'UNAVAILABLE', 'RUNNER'],
      ['AVAILABLE', 'UNAVAILABLE', 'ADMIN'],
      ['ON_MISSION', 'UNAVAILABLE', 'ADMIN'],
    ];

    it.each(allowed)(
      'allows %s -> %s by %s',
      (from, to, actor) => {
        expect(sm.canTransition(from, to, actor)).toBe(true);
      },
    );

    it('returns a valid RunnerTransitionResult on transition()', () => {
      const result = sm.transition('UNAVAILABLE', 'AVAILABLE', 'RUNNER');
      expect(result).toEqual({
        from: 'UNAVAILABLE',
        to: 'AVAILABLE',
        actor: 'RUNNER',
        description: 'Runner goes online',
      });
    });
  });

  // ── Negative: every forbidden transition must be rejected ────────────
  describe('canTransition — forbidden transitions', () => {
    const forbidden: Array<[RunnerStatus, RunnerStatus, RunnerActor, string]> = [
      // Cannot go from UNAVAILABLE to ON_MISSION directly
      ['UNAVAILABLE', 'ON_MISSION', 'SYSTEM', 'must go through AVAILABLE'],
      ['UNAVAILABLE', 'ON_MISSION', 'RUNNER', 'must go through AVAILABLE'],
      ['UNAVAILABLE', 'ON_MISSION', 'ADMIN', 'must go through AVAILABLE'],

      // Cannot go from ON_MISSION to UNAVAILABLE by RUNNER (only ADMIN)
      ['ON_MISSION', 'UNAVAILABLE', 'RUNNER', 'only ADMIN can force offline during mission'],

      // Cannot go from ON_MISSION to ON_MISSION (no self-transition)
      ['ON_MISSION', 'ON_MISSION', 'SYSTEM', 'no self-transition'],

      // Wrong actor for allowed target
      ['UNAVAILABLE', 'AVAILABLE', 'SYSTEM', 'only RUNNER or ADMIN can go online'],
      ['AVAILABLE', 'ON_MISSION', 'RUNNER', 'only SYSTEM can assign order'],
      ['AVAILABLE', 'ON_MISSION', 'ADMIN', 'only SYSTEM can assign order'],
      ['ON_MISSION', 'AVAILABLE', 'RUNNER', 'only SYSTEM can complete mission'],
      ['ON_MISSION', 'AVAILABLE', 'ADMIN', 'only SYSTEM can complete mission'],
      ['AVAILABLE', 'UNAVAILABLE', 'SYSTEM', 'only RUNNER or ADMIN can go offline'],

      // Backward transitions not in table
      ['AVAILABLE', 'UNAVAILABLE', 'SYSTEM', 'invalid actor'],
      ['AVAILABLE', 'AVAILABLE', 'RUNNER', 'no self-transition'],

      // Unknown actor
      ['UNAVAILABLE', 'AVAILABLE', 'UNKNOWN', 'unknown actor'],
    ];

    it.each(forbidden)(
      'rejects %s -> %s by %s (%s)',
      (from, to, actor, _desc) => {
        expect(sm.canTransition(from, to, actor)).toBe(false);
      },
    );

    it('throws UnprocessableEntityException on transition() for forbidden move', () => {
      expect(() => sm.transition('UNAVAILABLE', 'ON_MISSION', 'SYSTEM')).toThrow(
        expect.objectContaining({ status: 422 }),
      );
    });

    it('throws UnprocessableEntityException for wrong actor on allowed target', () => {
      expect(() => sm.transition('AVAILABLE', 'ON_MISSION', 'RUNNER')).toThrow(
        expect.objectContaining({ status: 422 }),
      );
    });
  });

  // ── Terminal state checks ────────────────────────────────────────────
  describe('isTerminal', () => {
    it('returns false for all runner states (no terminal states)', () => {
      const allStatuses: RunnerStatus[] = ['UNAVAILABLE', 'AVAILABLE', 'ON_MISSION'];
      for (const s of allStatuses) {
        expect(sm.isTerminal(s)).toBe(false);
      }
    });
  });

  // ── assertNotTerminal ────────────────────────────────────────────────
  describe('assertNotTerminal', () => {
    it('does not throw for any state (no terminal states)', () => {
      const allStatuses: RunnerStatus[] = ['UNAVAILABLE', 'AVAILABLE', 'ON_MISSION'];
      for (const s of allStatuses) {
        expect(() => sm.assertNotTerminal(s)).not.toThrow();
      }
    });
  });

  // ── Transition count ─────────────────────────────────────────────────
  describe('transition table integrity', () => {
    it('defines exactly 7 allowed runner transitions', () => {
      expect(RUNNER_TRANSITIONS).toHaveLength(7);
    });

    it('covers all 3 RunnerStatus enum values', () => {
      const statuses = new Set<RunnerStatus>();
      for (const t of RUNNER_TRANSITIONS) {
        statuses.add(t.from);
        statuses.add(t.to);
      }
      // Every status must appear at least once (as source or target)
      expect(statuses.size).toBe(3);
    });
  });
});