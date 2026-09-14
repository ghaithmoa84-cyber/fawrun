import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { type OrderStoreStatus } from '@fawrun/shared-constants';
import {
  TERMINAL_ORDER_STORE_STATUSES,
  type OrderStoreTransition,
} from './order-transitions.js';

export interface OrderStoreTransitionResult {
  from: OrderStoreStatus;
  to: OrderStoreStatus;
  actor: 'RUNNER' | 'SYSTEM';
  description: string;
}

export interface OrderStoreTransitionContext {
  actorId?: string;
  reason?: string;
  meta?: Record<string, unknown>;
}

/**
 * OrderStoreStateMachine enforces every status change on an OrderStore.
 *
 * Only the RUNNER (or SYSTEM) may transition store states. The customer
 * has no direct control over individual store outcomes.
 *
 * PENDING is the only source state; PURCHASED and SKIPPED are terminal.
 */
@Injectable()
export class OrderStoreStateMachine {
  private readonly index = new Map<string, OrderStoreTransition>();

  constructor(transitions: readonly OrderStoreTransition[]) {
    for (const t of transitions) {
      this.index.set(this.key(t.from, t.to, t.actor), t);
    }
  }

  private key(
    from: OrderStoreStatus,
    to: OrderStoreStatus,
    actor: 'RUNNER' | 'SYSTEM',
  ): string {
    return `${from}->${to}::${actor}`;
  }

  canTransition(
    from: OrderStoreStatus,
    to: OrderStoreStatus,
    actor: 'RUNNER' | 'SYSTEM',
  ): boolean {
    return this.index.has(this.key(from, to, actor));
  }

  getTransition(
    from: OrderStoreStatus,
    to: OrderStoreStatus,
    actor: 'RUNNER' | 'SYSTEM',
  ): OrderStoreTransition | null {
    return this.index.get(this.key(from, to, actor)) ?? null;
  }

  /**
   * @throws {UnprocessableEntityException} (422 BUSINESS_RULE_VIOLATION) when
   *         the transition is not allowed.
   */
  transition(
    from: OrderStoreStatus,
    to: OrderStoreStatus,
    actor: 'RUNNER' | 'SYSTEM',
    _ctx: OrderStoreTransitionContext = {},
  ): OrderStoreTransitionResult {
    const t = this.getTransition(from, to, actor);
    if (!t) {
      throw new UnprocessableEntityException(
        `Store transition not allowed: ${from} -> ${to} by ${actor}`,
      );
    }

    return {
      from: t.from,
      to: t.to,
      actor: t.actor,
      description: t.description,
    };
  }

  isTerminal(status: OrderStoreStatus): boolean {
    return TERMINAL_ORDER_STORE_STATUSES.includes(status);
  }

  assertNotTerminal(from: OrderStoreStatus): void {
    if (this.isTerminal(from)) {
      throw new UnprocessableEntityException(
        `Cannot transition from terminal store state: ${from}`,
      );
    }
  }
}
