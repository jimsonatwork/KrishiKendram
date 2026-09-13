import { FieldPolicyEvaluationService } from './field-policy-evaluation.service';

describe('FieldPolicyEvaluationService', () => {
  let service: FieldPolicyEvaluationService;

  const repository = {
    findByPermissionId: jest.fn(),
  };

  const fieldPolicyService = {
    evaluateFields: jest.fn(),
    getReadTransformPolicies: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new FieldPolicyEvaluationService(
      repository as any,
      fieldPolicyService as any,
    );
  });

  describe('evaluate()', () => {
    it('loads persisted policies and delegates evaluation', async () => {
      const policies = [
        {
          field: 'phone',
          effect: 'MASK',
        },
        {
          field: 'email',
          effect: 'ALLOW',
        },
      ];

      const evaluation = {
        allowed: true,
        decisions: [
          {
            field: 'phone',
            allowed: true,
            effect: 'MASK',
            reason: 'Field is readable with MASK policy.',
          },
          {
            field: 'email',
            allowed: true,
            effect: 'ALLOW',
            reason: 'Field is explicitly allowed for READ.',
          },
        ],
      };

      repository.findByPermissionId.mockResolvedValue(policies);
      fieldPolicyService.evaluateFields.mockReturnValue(evaluation);

      await expect(
        service.evaluate(
          'permission-1',
          ['phone', 'email'],
          'READ',
        ),
      ).resolves.toEqual(evaluation);

      expect(repository.findByPermissionId).toHaveBeenCalledWith(
        'permission-1',
      );

      expect(fieldPolicyService.evaluateFields).toHaveBeenCalledWith(
        ['phone', 'email'],
        'READ',
        policies,
      );
    });

    it('passes WRITE operations unchanged to the policy evaluator', async () => {
      const policies = [
        {
          field: 'phone',
          effect: 'ALLOW',
        },
      ];

      const evaluation = {
        allowed: true,
        decisions: [
          {
            field: 'phone',
            allowed: true,
            effect: 'ALLOW',
            reason: 'Field is explicitly allowed for WRITE.',
          },
        ],
      };

      repository.findByPermissionId.mockResolvedValue(policies);
      fieldPolicyService.evaluateFields.mockReturnValue(evaluation);

      await expect(
        service.evaluate(
          'permission-2',
          ['phone'],
          'WRITE',
        ),
      ).resolves.toEqual(evaluation);

      expect(fieldPolicyService.evaluateFields).toHaveBeenCalledWith(
        ['phone'],
        'WRITE',
        policies,
      );
    });

    it('preserves unknown persisted effects for fail-closed evaluation', async () => {
      const policies = [
        {
          field: 'sensitiveData',
          effect: 'FUTURE_EFFECT',
        },
      ];

      const evaluation = {
        allowed: false,
        decisions: [
          {
            field: 'sensitiveData',
            allowed: false,
            effect: null,
            reason: "Unknown field access effect 'FUTURE_EFFECT'.",
          },
        ],
      };

      repository.findByPermissionId.mockResolvedValue(policies);
      fieldPolicyService.evaluateFields.mockReturnValue(evaluation);

      const result = await service.evaluate(
        'permission-3',
        ['sensitiveData'],
        'READ',
      );

      expect(result).toEqual(evaluation);
      expect(fieldPolicyService.evaluateFields).toHaveBeenCalledWith(
        ['sensitiveData'],
        'READ',
        policies,
      );
    });

    it('does not perform resource authorization', async () => {
      repository.findByPermissionId.mockResolvedValue([]);
      fieldPolicyService.evaluateFields.mockReturnValue({
        allowed: true,
        decisions: [],
      });

      await service.evaluate(
        'permission-4',
        [],
        'READ',
      );

      expect(repository.findByPermissionId).toHaveBeenCalledTimes(1);
      expect(fieldPolicyService.evaluateFields).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllowedFields()', () => {
    it('returns only fields allowed by the evaluated policy', async () => {
      repository.findByPermissionId.mockResolvedValue([
        {
          field: 'name',
          effect: 'ALLOW',
        },
        {
          field: 'phone',
          effect: 'DENY',
        },
      ]);

      fieldPolicyService.evaluateFields.mockReturnValue({
        allowed: false,
        decisions: [
          {
            field: 'name',
            allowed: true,
            effect: 'ALLOW',
            reason: 'Field is explicitly allowed for READ.',
          },
          {
            field: 'phone',
            allowed: false,
            effect: 'DENY',
            reason: 'Field is explicitly denied for READ.',
          },
        ],
      });

      await expect(
        service.getAllowedFields(
          'permission-5',
          ['name', 'phone'],
          'READ',
        ),
      ).resolves.toEqual(['name']);

      expect(fieldPolicyService.evaluateFields).toHaveBeenCalledWith(
        ['name', 'phone'],
        'READ',
        [
          {
            field: 'name',
            effect: 'ALLOW',
          },
          {
            field: 'phone',
            effect: 'DENY',
          },
        ],
      );
    });
  });

  describe('getReadTransformPolicies()', () => {
    it('delegates READ transformation policy selection', async () => {
      const policies = [
        {
          field: 'phone',
          effect: 'MASK',
        },
      ];

      const transformations = [
        {
          field: 'phone',
          allowed: true,
          effect: 'MASK',
          reason: 'Field is readable with MASK policy.',
        },
      ];

      repository.findByPermissionId.mockResolvedValue(policies);
      fieldPolicyService.getReadTransformPolicies.mockReturnValue(
        transformations,
      );

      await expect(
        service.getReadTransformPolicies(
          'permission-6',
          ['phone', 'email'],
        ),
      ).resolves.toEqual(transformations);

      expect(repository.findByPermissionId).toHaveBeenCalledWith(
        'permission-6',
      );

      expect(
        fieldPolicyService.getReadTransformPolicies,
      ).toHaveBeenCalledWith(
        ['phone', 'email'],
        policies,
      );
    });

    it('does not perform the transformation itself', async () => {
      repository.findByPermissionId.mockResolvedValue([
        {
          field: 'phone',
          effect: 'MASK',
        },
      ]);

      fieldPolicyService.getReadTransformPolicies.mockReturnValue([
        {
          field: 'phone',
          allowed: true,
          effect: 'MASK',
          reason: 'Field is readable with MASK policy.',
        },
      ]);

      const result = await service.getReadTransformPolicies(
        'permission-7',
        ['phone'],
      );

      expect(result[0].effect).toBe('MASK');
      expect(
        fieldPolicyService.getReadTransformPolicies,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
