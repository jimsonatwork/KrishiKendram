export interface CredentialDeliveryRegistry {
  sensitiveInformation: {
    viewEnabled: boolean;
  };
}

export const credentialDeliveryRegistry: CredentialDeliveryRegistry = {
  sensitiveInformation: {
    viewEnabled: true,
  },
};
