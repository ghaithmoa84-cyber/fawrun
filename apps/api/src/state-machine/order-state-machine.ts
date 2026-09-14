import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { type OrderStatus } from '@fawrun/shared-constants';
import {
  TERMINAL_ORDER_STATUSES,
  type OrderActor,
  type OrderTransition,
} from './order-transitions.js';

export interface TransitionResult {
  from: OrderStatus;
  to: OrderStatus;
  actor: OrderActor;
  description: string;
}

export interface TransitionContext {
  actorId?: string;
  reason?: string;
  meta?: Record<string, unknown>;
}

/**
 * OrderStateMachine enforces every status change on an Order through a
 * canonical transition table. No status field may be mutated directly —
 * callers MUST go through `transition()`.
 *
 * Unknown transitions throw `UnprocessableEntityException` (HTTP 422),
 * which the global `AllExceptionsFilter` maps to `BUSINESS_RULE_VIOLATION`.
 */
@Injectable()
export class OrderStateMachine {
  private readonly index = new Map<string, OrderTransition>();

  constructor(transitions: readonly OrderTransition[]) {
    for (const t of transitions) {
      this.index.set(this.key(t.from, t.to, t.actor), t);
    }
  }

  private key(from: OrderStatus, to: OrderStatus, actor: OrderActor): string {
    return `${from}->${to}::${actor}`;
  }

  /**
   * Returns true if the transition is explicitly allowed in the table.
   */
  canTransition(
    from: OrderStatus,
    to: OrderStatus,
    actor: OrderActor,
  ): boolean {
    return this.index.has(this.key(from, to, actor));
  }

  /**
   * Returns the transition descriptor if allowed, otherwise null.
   */
  getTransition(
    from: OrderStatus,
    to: OrderStatus,
    actor: OrderActor,
  ): OrderTransition | null {
    return this.index.get(this.key(from, to, actor)) ?? null;
  }

  /**
   * Throws `UnprocessableEntityException` (422 BUSINESS_RULE_VIOLATION) when
   * the transition is not allowed. Returns a `TransitionResult` on success.
   *
   * @throws {UnprocessableEntityException} when transition is forbidden.
   */
  transition(
    from: OrderStatus,
    to: OrderStatus,
    actor: OrderActor,
    _ctx: TransitionContext = {},
  ): TransitionResult {
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
  isTerminal(status: OrderStatus): boolean {
    return TERMINAL_ORDER_STATUSES.includes(status);
  }

  /**
   * Asserts the current state is not terminal. Throws 422 if it is.
   */
  assertNotTerminal(from: OrderStatus): void {
    if (this.isTerminal(from)) {
      throw new UnprocessableEntityException(
        `Cannot transition from terminal state: ${from}`,
      );
    }
  }
}
