import { BadRequestException } from '@nestjs/common';
import { MessagingIntegrationService } from './messaging-integration.service';

describe('MessagingIntegrationService', () => {
  let service: MessagingIntegrationService;
  let connection: any;
  let consent: any;
  let fetchMock: jest.Mock;

  const prisma: any = {
    messagingProviderConnection: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    messagingRecipientConsent: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KK_MESSAGING_ENCRYPTION_KEY = 'a'.repeat(64);
    connection = null;
    consent = null;
    prisma.messagingProviderConnection.upsert.mockImplementation(async ({ create, update }: any) => {
      connection = { ...create, ...update, id: 'connection-1', lastTestedAt: null };
      return { id: connection.id, provider: connection.provider, displayName: connection.displayName, status: connection.status, createdAt: new Date(), updatedAt: new Date() };
    });
    prisma.messagingProviderConnection.findUnique.mockImplementation(async () => connection);
    prisma.messagingRecipientConsent.upsert.mockImplementation(async ({ create, update }: any) => {
      consent = { ...create, ...update, id: 'consent-1' };
      return { id: consent.id, consentSource: consent.consentSource, consentedAt: consent.consentedAt, revokedAt: consent.revokedAt };
    });
    prisma.messagingRecipientConsent.findFirst.mockImplementation(async () => consent);
    fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { user_id: 'arattai-user-1', ack_key: 'ack-1', cost: '0.5' } }) });
    global.fetch = fetchMock as any;
    service = new MessagingIntegrationService(prisma);
  });

  afterAll(() => { delete process.env.KK_MESSAGING_ENCRYPTION_KEY; });

  it('stores the provider token encrypted and never returns the token', async () => {
    const rawToken = 'arattai-access-token-that-is-long-enough';
    const result = await service.connectArattai('user-1', { accessToken: rawToken, displayName: 'J & J' });
    expect(connection.accessTokenCiphertext).not.toBe(rawToken);
    expect(connection.accessTokenNonce).toBeTruthy();
    expect(connection.accessTokenTag).toBeTruthy();
    expect(result).not.toHaveProperty('accessToken');
    expect(connection.userId).toBe('user-1');
  });

  it('uses the official Arattai test-promotion endpoint and template payload', async () => {
    await service.connectArattai('user-1', { accessToken: 'arattai-access-token-that-is-long-enough' });
    const result = await service.sendTestPromotion('user-1', {
      phoneNumber: '919876543210', templateId: 'approved-test-template', language: 'en', variables: { item_name: 'Paddy seed' },
    });
    expect(fetchMock).toHaveBeenCalledWith('https://business.arattai.in/api/v1/promotions/test', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
      body: JSON.stringify({ phone_number: '91-9876543210', id: 'approved-test-template', language: 'en', mode: 'draft', variables: { item_name: 'Paddy seed' } }),
    }));
    expect(result.accepted).toBe(true);
    expect(result.acknowledgementKey).toBe('ack-1');
  });

  it('sends operational notifications only with transactional-purpose consent', async () => {
    await service.connectArattai('user-1', { accessToken: 'arattai-access-token-that-is-long-enough' });
    await service.recordPromotionalConsent('user-1', {
      phoneNumber: '919876543210', confirmed: true, source: 'IN_APP', purpose: 'TRANSACTIONAL',
    });
    const result = await service.sendTransactionalMessage('user-1', {
      consentId: 'consent-1', templateId: 'approved-transaction-template', language: 'te', variables: { order_id: 'KK-42' },
    });
    expect(fetchMock).toHaveBeenCalledWith('https://business.arattai.in/api/v1/transactions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ id: 'approved-transaction-template', phone_number: '91-9876543210', language: 'te', variables: { order_id: 'KK-42' } }),
    }));
    expect(result.accepted).toBe(true);
  });

  it('requires recipient opt-in and blocks promotional sends after consent is absent or revoked', async () => {
    await expect(service.recordPromotionalConsent('user-1', {
      phoneNumber: '919876543210', confirmed: false, source: 'IN_APP',
    })).rejects.toBeInstanceOf(BadRequestException);

    await service.connectArattai('user-1', { accessToken: 'arattai-access-token-that-is-long-enough' });
    await service.recordPromotionalConsent('user-1', {
      phoneNumber: '919876543210', confirmed: true, source: 'IN_APP', note: 'Consent captured in app',
    });
    expect(consent.recipientCiphertext).toBeTruthy();
    expect(consent.recipientCiphertext).not.toContain('919876543210');
    expect(consent.recipientHash).not.toBe('919876543210');

    const result = await service.sendPromotionalMessage('user-1', { consentId: 'consent-1', templateId: 'approved-template', language: 'te', variables: { offer: '10%' } });
    expect(fetchMock).toHaveBeenCalledWith('https://business.arattai.in/api/v1/promotions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ id: 'approved-template', phone_number: '91-9876543210', language: 'te', variables: { offer: '10%' } }),
    }));
    expect(result.accepted).toBe(true);

    prisma.messagingRecipientConsent.findFirst.mockResolvedValueOnce(null);
    await expect(service.sendPromotionalMessage('user-1', { consentId: 'revoked-consent', templateId: 'approved-template' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
