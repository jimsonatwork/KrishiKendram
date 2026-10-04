export type CredentialDeliveryMethod =
  | 'email'
  | 'mobile'
  | 'push'
  | 'atplace';

export interface CredentialDeliveryRegistry {
  sensitiveInformation: { viewEnabled: boolean };
  methods: Record<CredentialDeliveryMethod, boolean>;
  atplace: {
    enabled: boolean;
    artifactDirectory: string;
    artifactExtension: 'svg';
  };
}

export const credentialDeliveryRegistry: CredentialDeliveryRegistry = {
  sensitiveInformation: { viewEnabled: true },
  methods: {
    email: false,
    mobile: false,
    push: false,
    atplace: true,
  },
  atplace: {
    enabled: true,
    artifactDirectory: 'atplace',
    artifactExtension: 'svg',
  },
};
