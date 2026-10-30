import { AuthorizationAction, AuthorizationScope } from '../../../authorization/authorization.types';
import { ResourceDefinition } from '../../resource-definition.interface';

export const marketplaceListingQuestionResource: ResourceDefinition = {
  name: 'marketplaceListingQuestion', module: 'marketplace', model: 'MarketplaceListingQuestion', ownerField: 'askerId',
  fields: {
    question: { definition: 'marketplaceListingQuestionText' },
    answer: { definition: 'marketplaceListingAnswerText' },
    questionType: { definition: 'marketplaceListingQuestionType' },
    visibility: { definition: 'marketplaceListingQuestionVisibility' },
    status: { definition: 'marketplaceListingQuestionStatus' },
    listingId: { definition: 'marketplaceResourceId' },
  },
  searchableFields: ['question', 'answer', 'listingId'], sortableFields: ['createdAt', 'answeredAt'], defaultSort: 'createdAt:desc',
  capabilities: [
    { action: AuthorizationAction.READ, scopes: [AuthorizationScope.OWN, AuthorizationScope.PUBLIC] },
    { action: AuthorizationAction.CREATE, scopes: [AuthorizationScope.OWN] },
    { action: AuthorizationAction.UPDATE, scopes: [AuthorizationScope.OWN] },
  ],
  permissions: ['READ', 'CREATE', 'UPDATE'], scopes: ['OWN', 'PUBLIC'], features: ['participant-private', 'audit-history', 'listing-owner-answer'],
};
