import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';

/**
 * Resource-level authorization for a user's own canonical AI conversation.
 * The AI module contract remains the source of truth for context field allowlists.
 */
export const conversationResource: ResourceDefinition = {
  name: 'conversation',
  module: 'platform',
  model: 'Conversation',
  ownerField: 'userId',
  capabilities: [
    { action: AuthorizationAction.READ, scopes: [AuthorizationScope.OWN] },
  ],
  scopes: [AuthorizationScope.OWN],
};
