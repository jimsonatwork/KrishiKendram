import { Injectable } from '@nestjs/common';

import { FieldAccessEffect } from './authorization.types';

export type FieldPolicyOperation = 'READ' | 'WRITE';

export interface FieldPolicyRecord {
  field: string;
  effect: string;
}

export interface FieldPolicyDecision {
  field: string;
  allowed: boolean;
  effect: FieldAccessEffect | null;
  reason: string;
}

export interface FieldPolicyEvaluation {
  allowed: boolean;
  decisions: FieldPolicyDecision[];
}

@Injectable()
export class FieldPolicyService {
  /**
   * Evaluates one field against an already-authorized resource permission.
   *
   * Field policy is intentionally a second-stage authorization check.
   * This service must never grant resource access by itself.
   */
  evaluate(
    field: string,
    operation: FieldPolicyOperation,
    policy?: FieldPolicyRecord | null,
  ): FieldPolicyDecision {
    if (!policy) {
      return {
        field,
        allowed: true,
        effect: null,
        reason: 'No field-specific policy is configured.',
      };
    }

    const effect = this.parseEffect(policy.effect);

    if (!effect) {
      return {
        field,
        allowed: false,
        effect: null,
        reason: `Unknown field access effect '${policy.effect}'.`,
      };
    }

    if (operation === 'WRITE') {
      return this.evaluateWrite(field, effect);
    }

    return this.evaluateRead(field, effect);
  }

  /**
   * Evaluates a collection of fields.
   *
   * Fields without an explicit FieldPermission remain allowed because
   * resource-level authorization has already been established by the
   * AuthorizationService.
   */
  evaluateFields(
    fields: readonly string[],
    operation: FieldPolicyOperation,
    policies: readonly FieldPolicyRecord[] = [],
  ): FieldPolicyEvaluation {
    const policyMap = new Map(
      policies.map((policy) => [policy.field, policy]),
    );

    const decisions = fields.map((field) =>
      this.evaluate(
        field,
        operation,
        policyMap.get(field),
      ),
    );

    return {
      allowed: decisions.every((decision) => decision.allowed),
      decisions,
    };
  }

  /**
   * Returns the fields that are authorized for the requested operation.
   *
   * For READ, fields with MASK/REDACT/AGGREGATE/TRANSFORM remain visible
   * to the caller because the transformation stage must apply the effect
   * rather than silently dropping the field.
   *
   * For WRITE, only explicitly allowed fields are returned.
   */
  getAllowedFields(
    fields: readonly string[],
    operation: FieldPolicyOperation,
    policies: readonly FieldPolicyRecord[] = [],
  ): string[] {
    const evaluation = this.evaluateFields(
      fields,
      operation,
      policies,
    );

    return evaluation.decisions
      .filter((decision) => decision.allowed)
      .map((decision) => decision.field);
  }

  /**
   * Returns fields that require a post-read transformation.
   */
  getReadTransformPolicies(
    fields: readonly string[],
    policies: readonly FieldPolicyRecord[] = [],
  ): FieldPolicyDecision[] {
    const evaluation = this.evaluateFields(
      fields,
      'READ',
      policies,
    );

    return evaluation.decisions.filter(
      (decision) =>
        decision.allowed &&
        decision.effect !== null &&
        [
          FieldAccessEffect.MASK,
          FieldAccessEffect.REDACT,
          FieldAccessEffect.AGGREGATE,
          FieldAccessEffect.TRANSFORM,
        ].includes(decision.effect),
    );
  }

  /**
   * Validates a persisted field access effect.
   *
   * Unknown database values fail closed rather than becoming an implicit
   * ALLOW. This protects the system if policy data is corrupted or a
   * future effect is introduced without updating this service.
   */
  private parseEffect(
    value: string,
  ): FieldAccessEffect | null {
    const effects = Object.values(FieldAccessEffect);

    if (!effects.includes(value as FieldAccessEffect)) {
      return null;
    }

    return value as FieldAccessEffect;
  }

  private evaluateRead(
    field: string,
    effect: FieldAccessEffect,
  ): FieldPolicyDecision {
    switch (effect) {
      case FieldAccessEffect.ALLOW:
        return {
          field,
          allowed: true,
          effect,
          reason: 'Field is explicitly allowed for READ.',
        };

      case FieldAccessEffect.DENY:
        return {
          field,
          allowed: false,
          effect,
          reason: 'Field is explicitly denied for READ.',
        };

      case FieldAccessEffect.MASK:
      case FieldAccessEffect.REDACT:
      case FieldAccessEffect.AGGREGATE:
      case FieldAccessEffect.TRANSFORM:
        return {
          field,
          allowed: true,
          effect,
          reason: `Field is readable with ${effect} policy.`,
        };
    }
  }

  private evaluateWrite(
    field: string,
    effect: FieldAccessEffect,
  ): FieldPolicyDecision {
    if (effect === FieldAccessEffect.ALLOW) {
      return {
        field,
        allowed: true,
        effect,
        reason: 'Field is explicitly allowed for WRITE.',
      };
    }

    return {
      field,
      allowed: false,
      effect,
      reason: `Field cannot be written with ${effect} policy.`,
    };
  }
}
