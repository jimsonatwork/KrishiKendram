import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types'
import { ResourceDefinition } from '../../resource-definition.interface'

export const permissionResource: ResourceDefinition = {
  name: 'permission',
  module: 'platform',
  model: 'Permission',
  capabilities: [
    { action: AuthorizationAction.READ, scopes: [AuthorizationScope.GLOBAL] },
  ],
  scopes: [AuthorizationScope.GLOBAL],
}
