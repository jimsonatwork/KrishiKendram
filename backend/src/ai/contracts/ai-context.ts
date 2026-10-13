/** Shared contract for minimal, registry-approved context passed to AI providers. */
export interface UserAiContextEnvelope {
  policy: {
    registryId: string;
    authorizationBeforeContext: true;
    databaseWriteAllowed: false;
    userConfirmationRequired: true;
  };
  actor: { userId: string };
  module: { moduleId: string; capability: string };
  references: Record<string, unknown>;
  fields: Record<string, unknown>;
}
