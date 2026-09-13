import { Injectable } from '@nestjs/common';

import {
  FieldPolicyEvaluation,
  FieldPolicyOperation,
  FieldPolicyService,
} from './field-policy.service';
import { FieldPolicyRepository } from './field-policy.repository';

@Injectable()
export class FieldPolicyEvaluationService {
  constructor(
    private readonly repository: FieldPolicyRepository,
    private readonly fieldPolicyService: FieldPolicyService,
  ) {}

  /**
   * Loads persisted field policy and evaluates it for an already-authorized
   * resource operation.
   *
   * This service intentionally does not perform resource authorization.
   * AuthorizationService remains the first-stage resource authorization gate.
   */
  async evaluate(
    permissionId: string,
    fields: readonly string[],
    operation: FieldPolicyOperation,
  ): Promise<FieldPolicyEvaluation> {
    const policies = await this.repository.findByPermissionId(permissionId);

    return this.fieldPolicyService.evaluateFields(
      fields,
      operation,
      policies,
    );
  }

  /**
   * Returns fields that remain usable for the requested operation after the
   * persisted field policy has been evaluated.
   */
  async getAllowedFields(
    permissionId: string,
    fields: readonly string[],
    operation: FieldPolicyOperation,
  ): Promise<string[]> {
    const evaluation = await this.evaluate(
      permissionId,
      fields,
      operation,
    );

    return evaluation.decisions
      .filter((decision) => decision.allowed)
      .map((decision) => decision.field);
  }

  /**
   * Returns READ policies that require a later transformation step such as
   * MASK, REDACT, AGGREGATE, or TRANSFORM.
   *
   * Transformation is intentionally not performed here.
   */
  async getReadTransformPolicies(
    permissionId: string,
    fields: readonly string[],
  ) {
    const policies = await this.repository.findByPermissionId(permissionId);

    return this.fieldPolicyService.getReadTransformPolicies(
      fields,
      policies,
    );
  }
}
