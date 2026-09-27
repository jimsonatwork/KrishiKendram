import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types'
import type { ResourceDefinition } from '../../resource-definition.interface'

export const auditResource: ResourceDefinition = {
  name: 'audit',
  module: 'platform',
  model: 'AuditEvent',
  capabilities: [
    { action: AuthorizationAction.READ, scopes: [AuthorizationScope.GLOBAL] },
  ],
  scopes: [AuthorizationScope.GLOBAL],
}
