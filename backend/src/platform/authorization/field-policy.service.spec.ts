import { FieldAccessEffect } from './authorization.types';
import { FieldPolicyService } from './field-policy.service';

describe('FieldPolicyService', () => {
  let service: FieldPolicyService;

  beforeEach(() => {
    service = new FieldPolicyService();
  });

  describe('evaluate()', () => {
    it('allows a field when no policy exists', () => {
      expect(service.evaluate('name', 'READ')).toEqual({
        field: 'name',
        allowed: true,
        effect: null,
        reason: 'No field-specific policy is configured.',
      });
    });

    it('allows READ with ALLOW', () => {
      expect(
        service.evaluate('name', 'READ', {
          field: 'name',
          effect: FieldAccessEffect.ALLOW,
        }),
      ).toEqual({
        field: 'name',
        allowed: true,
        effect: FieldAccessEffect.ALLOW,
        reason: 'Field is explicitly allowed for READ.',
      });
    });

    it('denies READ with DENY', () => {
      expect(
        service.evaluate('name', 'READ', {
          field: 'name',
          effect: FieldAccessEffect.DENY,
        }),
      ).toEqual({
        field: 'name',
        allowed: false,
        effect: FieldAccessEffect.DENY,
        reason: 'Field is explicitly denied for READ.',
      });
    });

    it.each([
      FieldAccessEffect.MASK,
      FieldAccessEffect.REDACT,
      FieldAccessEffect.AGGREGATE,
      FieldAccessEffect.TRANSFORM,
    ])('allows READ with transformation effect %s', (effect) => {
      const result = service.evaluate('phone', 'READ', {
        field: 'phone',
        effect,
      });

      expect(result.allowed).toBe(true);
      expect(result.effect).toBe(effect);
    });

    it('allows WRITE when no policy exists', () => {
      expect(service.evaluate('name', 'WRITE')).toEqual({
        field: 'name',
        allowed: true,
        effect: null,
        reason: 'No field-specific policy is configured.',
      });
    });

    it('allows WRITE with ALLOW', () => {
      const result = service.evaluate('name', 'WRITE', {
        field: 'name',
        effect: FieldAccessEffect.ALLOW,
      });

      expect(result.allowed).toBe(true);
      expect(result.effect).toBe(FieldAccessEffect.ALLOW);
    });

    it('rejects WRITE with DENY', () => {
      const result = service.evaluate('name', 'WRITE', {
        field: 'name',
        effect: FieldAccessEffect.DENY,
      });

      expect(result.allowed).toBe(false);
      expect(result.effect).toBe(FieldAccessEffect.DENY);
    });

    it.each([
      FieldAccessEffect.MASK,
      FieldAccessEffect.REDACT,
      FieldAccessEffect.AGGREGATE,
      FieldAccessEffect.TRANSFORM,
    ])('rejects WRITE with transformation effect %s', (effect) => {
      const result = service.evaluate('name', 'WRITE', {
        field: 'name',
        effect,
      });

      expect(result.allowed).toBe(false);
      expect(result.effect).toBe(effect);
    });

    it('fails closed for an unknown effect', () => {
      const result = service.evaluate('name', 'READ', {
        field: 'name',
        effect: 'UNKNOWN_EFFECT',
      });

      expect(result.allowed).toBe(false);
      expect(result.effect).toBeNull();
      expect(result.reason).toBe(
        "Unknown field access effect 'UNKNOWN_EFFECT'.",
      );
    });
  });

  describe('evaluateFields()', () => {
    it('allows all fields when no policies exist', () => {
      const result = service.evaluateFields(
        ['name', 'age', 'phone'],
        'READ',
      );

      expect(result.allowed).toBe(true);
      expect(result.decisions).toEqual([
        {
          field: 'name',
          allowed: true,
          effect: null,
          reason: 'No field-specific policy is configured.',
        },
        {
          field: 'age',
          allowed: true,
          effect: null,
          reason: 'No field-specific policy is configured.',
        },
        {
          field: 'phone',
          allowed: true,
          effect: null,
          reason: 'No field-specific policy is configured.',
        },
      ]);
    });

    it('evaluates multiple fields independently', () => {
      const result = service.evaluateFields(
        ['name', 'phone', 'email'],
        'READ',
        [
          { field: 'name', effect: FieldAccessEffect.ALLOW },
          { field: 'phone', effect: FieldAccessEffect.DENY },
          { field: 'email', effect: FieldAccessEffect.MASK },
        ],
      );

      expect(result.allowed).toBe(false);
      expect(result.decisions).toEqual([
        {
          field: 'name',
          allowed: true,
          effect: FieldAccessEffect.ALLOW,
          reason: 'Field is explicitly allowed for READ.',
        },
        {
          field: 'phone',
          allowed: false,
          effect: FieldAccessEffect.DENY,
          reason: 'Field is explicitly denied for READ.',
        },
        {
          field: 'email',
          allowed: true,
          effect: FieldAccessEffect.MASK,
          reason: 'Field is readable with MASK policy.',
        },
      ]);
    });

    it('allows READ transformation policies while denying explicit DENY', () => {
      const result = service.evaluateFields(
        ['phone', 'email', 'secret'],
        'READ',
        [
          { field: 'phone', effect: FieldAccessEffect.MASK },
          { field: 'email', effect: FieldAccessEffect.REDACT },
          { field: 'secret', effect: FieldAccessEffect.DENY },
        ],
      );

      expect(result.allowed).toBe(false);

      expect(result.decisions[0].allowed).toBe(true);
      expect(result.decisions[0].effect).toBe(FieldAccessEffect.MASK);

      expect(result.decisions[1].allowed).toBe(true);
      expect(result.decisions[1].effect).toBe(FieldAccessEffect.REDACT);

      expect(result.decisions[2].allowed).toBe(false);
      expect(result.decisions[2].effect).toBe(FieldAccessEffect.DENY);
    });

    it('rejects transformation effects during WRITE', () => {
      const result = service.evaluateFields(
        ['name', 'phone', 'email'],
        'WRITE',
        [
          { field: 'name', effect: FieldAccessEffect.ALLOW },
          { field: 'phone', effect: FieldAccessEffect.MASK },
          { field: 'email', effect: FieldAccessEffect.TRANSFORM },
        ],
      );

      expect(result.allowed).toBe(false);
      expect(result.decisions[0].allowed).toBe(true);
      expect(result.decisions[1].allowed).toBe(false);
      expect(result.decisions[2].allowed).toBe(false);
    });
  });

  describe('getAllowedFields()', () => {
    it('returns all fields when no policies exist', () => {
      expect(
        service.getAllowedFields(
          ['name', 'phone', 'email'],
          'READ',
        ),
      ).toEqual(['name', 'phone', 'email']);
    });

    it('keeps READ transformation fields because they remain visible', () => {
      expect(
        service.getAllowedFields(
          ['name', 'phone', 'email'],
          'READ',
          [
            { field: 'phone', effect: FieldAccessEffect.DENY },
            { field: 'email', effect: FieldAccessEffect.MASK },
          ],
        ),
      ).toEqual(['name', 'email']);
    });

    it('returns only writable fields for WRITE', () => {
      expect(
        service.getAllowedFields(
          ['name', 'phone', 'email'],
          'WRITE',
          [
            { field: 'phone', effect: FieldAccessEffect.DENY },
            { field: 'email', effect: FieldAccessEffect.TRANSFORM },
          ],
        ),
      ).toEqual(['name']);
    });
  });

  describe('getReadTransformPolicies()', () => {
    it('returns only READ transformation decisions', () => {
      const result = service.getReadTransformPolicies(
        ['name', 'phone', 'email', 'notes', 'address', 'secret'],
        [
          { field: 'name', effect: FieldAccessEffect.ALLOW },
          { field: 'phone', effect: FieldAccessEffect.MASK },
          { field: 'email', effect: FieldAccessEffect.REDACT },
          { field: 'notes', effect: FieldAccessEffect.AGGREGATE },
          { field: 'address', effect: FieldAccessEffect.TRANSFORM },
          { field: 'secret', effect: FieldAccessEffect.DENY },
        ],
      );

      expect(result).toEqual([
        {
          field: 'phone',
          allowed: true,
          effect: FieldAccessEffect.MASK,
          reason: 'Field is readable with MASK policy.',
        },
        {
          field: 'email',
          allowed: true,
          effect: FieldAccessEffect.REDACT,
          reason: 'Field is readable with REDACT policy.',
        },
        {
          field: 'notes',
          allowed: true,
          effect: FieldAccessEffect.AGGREGATE,
          reason: 'Field is readable with AGGREGATE policy.',
        },
        {
          field: 'address',
          allowed: true,
          effect: FieldAccessEffect.TRANSFORM,
          reason: 'Field is readable with TRANSFORM policy.',
        },
      ]);
    });

    it('returns an empty array when no transformations exist', () => {
      expect(
        service.getReadTransformPolicies(
          ['name', 'secret'],
          [
            { field: 'name', effect: FieldAccessEffect.ALLOW },
            { field: 'secret', effect: FieldAccessEffect.DENY },
          ],
        ),
      ).toEqual([]);
    });
  });
});
