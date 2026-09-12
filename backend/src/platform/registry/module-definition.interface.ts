export type ModuleLifecycleState =
  | 'ACTIVE'
  | 'DISABLED'
  | 'DEPRECATED';

export interface ModuleDefinition {
  /**
   * Stable module identity.
   *
   * This must match ResourceDefinition.module for resources
   * belonging to this module.
   */
  id: string;

  /**
   * Human-readable module name.
   */
  name: string;

  /**
   * Current platform lifecycle state.
   */
  lifecycle: ModuleLifecycleState;

  /**
   * Other module identities that must exist before this
   * module can be considered structurally complete.
   */
  dependencies?: string[];
}
