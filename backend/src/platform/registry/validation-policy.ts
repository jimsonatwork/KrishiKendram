export type ValidationAction = 'ALLOW' | 'WARNING' | 'BLOCK' | 'TRANSFER_REQUIRED' | 'CONFIRM_REQUIRED'

export type ContactConflictType = 'EMAIL' | 'MOBILE' | 'EMAIL_MOBILE_COMBINATION'

export type ContactValidationDecision = {
  action: ValidationAction
  message: string
}

export const VALIDATION_POLICY = {
  contacts: {
    email: { duplicate: { action: 'BLOCK' as ValidationAction, message: 'Email address is already in use.' } },
    mobile: { duplicate: { action: 'TRANSFER_REQUIRED' as ValidationAction, message: 'Mobile number is assigned to another user. Transfer/reassignment is required.' } },
    combination: { duplicate: { action: 'BLOCK' as ValidationAction, message: 'The email and mobile combination is already assigned to another user.' } },
  },
} as const

export function evaluateContactConflict(type: ContactConflictType): ContactValidationDecision {
  if (type === 'EMAIL') return VALIDATION_POLICY.contacts.email.duplicate
  if (type === 'MOBILE') return VALIDATION_POLICY.contacts.mobile.duplicate
  return VALIDATION_POLICY.contacts.combination.duplicate
}
