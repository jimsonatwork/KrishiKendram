CREATE TABLE "MessagingProviderConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "displayName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CONNECTED',
  "accessTokenCiphertext" TEXT NOT NULL,
  "accessTokenNonce" TEXT NOT NULL,
  "accessTokenTag" TEXT NOT NULL,
  "tokenExpiresAt" TIMESTAMP(3),
  "lastTestedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessagingProviderConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessagingProviderConnection_userId_provider_key" ON "MessagingProviderConnection"("userId", "provider");
CREATE INDEX "MessagingProviderConnection_provider_status_idx" ON "MessagingProviderConnection"("provider", "status");
ALTER TABLE "MessagingProviderConnection" ADD CONSTRAINT "MessagingProviderConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MessagingRecipientConsent" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "recipientHash" TEXT NOT NULL,
  "recipientCiphertext" TEXT NOT NULL,
  "recipientNonce" TEXT NOT NULL,
  "recipientTag" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'PROMOTIONAL',
  "consentSource" TEXT NOT NULL,
  "consentNote" TEXT,
  "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessagingRecipientConsent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessagingRecipientConsent_ownerId_provider_recipientHash_purpose_key" ON "MessagingRecipientConsent"("ownerId", "provider", "recipientHash", "purpose");
CREATE INDEX "MessagingRecipientConsent_ownerId_provider_purpose_revokedAt_idx" ON "MessagingRecipientConsent"("ownerId", "provider", "purpose", "revokedAt");
ALTER TABLE "MessagingRecipientConsent" ADD CONSTRAINT "MessagingRecipientConsent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
