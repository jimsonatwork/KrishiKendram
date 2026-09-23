import {
  AuthorizationAction,
  AuthorizationScope,
} from '../authorization/authorization.types';

export interface CapabilityDefinition {
  action: AuthorizationAction;
  scopes: AuthorizationScope[];
}
