export type RunnerActor = 'ADMIN' | 'RUNNER' | 'SYSTEM';

export interface RunnerTransition {
  readonly from: RunnerStatus;
  readonly to: RunnerStatus;
  readonly actor: RunnerActor;
  readonly description: string;
}

export type RunnerStatus = 'UNAVAILABLE' | 'AVAILABLE' | 'ON_MISSION';

export const RUNNER_STATUSES = ['UNAVAILABLE', 'AVAILABLE', 'ON_MISSION'] as const;

export const RUNNER_TRANSITIONS: readonly RunnerTransition[] = [
  // UNAVAILABLE → AVAILABLE (Runner goes online)
  { from: 'UNAVAILABLE', to: 'AVAILABLE', actor: 'RUNNER', description: 'Runner goes online' },
  { from: 'UNAVAILABLE', to: 'AVAILABLE', actor: 'ADMIN', description: 'Admin sets runner online' },

  // AVAILABLE → ON_MISSION (Order assigned via assignRunner)
  { from: 'AVAILABLE', to: 'ON_MISSION', actor: 'SYSTEM', description: 'Order assigned to runner' },

  // ON_MISSION → AVAILABLE (Order cancelled/delivered)
  { from: 'ON_MISSION', to: 'AVAILABLE', actor: 'SYSTEM', description: 'Order completed or cancelled, runner available' },

  // AVAILABLE → UNAVAILABLE (Runner goes offline)
  { from: 'AVAILABLE', to: 'UNAVAILABLE', actor: 'RUNNER', description: 'Runner goes offline' },
  { from: 'AVAILABLE', to: 'UNAVAILABLE', actor: 'ADMIN', description: 'Admin sets runner offline' },

  // ON_MISSION → UNAVAILABLE (Admin force offline)
  { from: 'ON_MISSION', to: 'UNAVAILABLE', actor: 'ADMIN', description: 'Admin forces runner offline during mission' },
];

export const TERMINAL_RUNNER_STATUSES: readonly RunnerStatus[] = [];