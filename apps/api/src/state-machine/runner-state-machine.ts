import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  type RunnerActor,
  type RunnerStatus,
  type RunnerTransition,
  RUNNER_TRANSITIONS,
  TERMINAL_RUNNER_STATUSES,
} from './runner-transitions.js';

export interface RunnerTransitionResult {
  from: RunnerStatus;
  to: RunnerStatus;
  actor: RunnerActor;
  description: string;
}

export interface RunnerTransitionContext {
  actorId?: string;
  reason?: string;
  meta?: Record<string, unknown>;
}

/**
 * RunnerStateMachine enforces every status change on a Runner through a
 * canonical transition table. No status field may be mutated directly —
 * callers MUST go through `transition()`.
 *
 * Unknown transitions throw `UnprocessableEntityException` (HTTP 422),
 * which the global `AllExceptionsFilter` maps to `BUSINESS_RULE_VIOLATION`.
 */
@Injectable()
export class RunnerStateMachine {
  private readonly index = new Map<string, RunnerTransition>();

  constructor(transitions: readonly RunnerTransition[] = RUNNER_TRANSITIONS) {
    for (const t of transitions) {
      this.index.set(this.key(t.from, t.to, t.actor), t);
    }
  }

  private key(from: RunnerStatus, to: RunnerStatus, actor: RunnerActor): string {
    return `${from}->${to}::${actor}`;
  }

  /**
   * Returns true if the transition is explicitly allowed in the table.
   */
  canTransition(
    from: RunnerStatus,
    to: RunnerStatus,
    actor: RunnerActor,
  ): boolean {
    return this.index.has(this.key(from, to, actor));
  }

  /**
   * Returns the transition descriptor if allowed, otherwise null.
   */
  getTransition(
    from: RunnerStatus,
    to: RunnerStatus,
    actor: RunnerActor,
  ): RunnerTransition | null {
    return this.index.get(this.key(from, to, actor)) ?? null;
  }

  /**
   * Throws `UnprocessableEntityException` (422 BUSINESS_RULE_VIOLATION) when
   * the transition is not allowed. Returns a `RunnerTransitionResult` on success.
   *
   * @throws {UnprocessableEntityException} when transition is forbidden.
   */
  transition(
    from: RunnerStatus,
    to: RunnerStatus,
    actor: RunnerActor,
    _ctx: RunnerTransitionContext = {},
  ): RunnerTransitionResult {
    const t = this.getTransition(from, to, actor);
    if (!t) {
      throw new UnprocessableEntityException(
        `Transition not allowed: ${from} -> ${to} by ${actor}`,
      );
    }

    return {
      from: t.from,
      to: t.to,
      actor: t.actor,
      description: t.description,
    };
  }

  /**
   * Returns true when `status` is a terminal state with no outgoing transitions.
   */
  isTerminal(status: RunnerStatus): boolean {
    return TERMINAL_RUNNER_STATUSES.includes(status);
  }

  /**
   * Asserts the current state is not terminal. Throws 422 if it is.
   */
  assertNotTerminal(from: RunnerStatus): void {
    if (this.isTerminal(from)) {
      throw new UnprocessableEntityException(
        `Cannot transition from terminal state: ${from}`,
      );
    }
  }
}