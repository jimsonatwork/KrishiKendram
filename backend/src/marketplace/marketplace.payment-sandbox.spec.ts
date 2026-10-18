import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { createHash, createHmac } from 'node:crypto';
import { MarketplaceService } from './marketplace.service';

describe('Marketplace sandbox payment flow', () => {
  const oldMode = process.env.KK_MARKETPLACE_PAYMENT_MODE;
  const oldSecret = process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET;
  const payment = {
    id: 'payment-1', orderId: 'order-1', provider: 'sandbox', providerPaymentId: 'sandbox_payment-1',
    idempotencyKey: 'idem-key-0001', status: 'AUTHORIZED', amount: new Prisma.Decimal('125.00'),
    currency: 'INR', quoteSnapshot: { subtotal: '125.00' }, externalEventId: null,
  };
  let prisma: any;
  let audit: any;
  let authorization: any;
  let registry: any;
  let service: MarketplaceService;

  beforeEach(() => {
    process.env.KK_MARKETPLACE_PAYMENT_MODE = 'sandbox';
    process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET = 'sandbox-test-secret-at-least-32-chars';
    prisma = {
      marketplaceFeatureFlag: { findUnique: jest.fn().mockResolvedValue({ enabled: true }) },
      marketplaceOrder: { findUnique: jest.fn().mockResolvedValue({ id: 'order-1', buyerId: 'buyer-1', sellerId: 'seller-1', status: 'ACCEPTED', buyerTotal: new Prisma.Decimal('125.00'), currency: 'INR', pricingSnapshot: { subtotal: '125.00' } }) },
      marketplacePayment: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(payment), create: jest.fn(), update: jest.fn() },
      marketplacePaymentEvent: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      marketplaceRefund: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn(), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }), create: jest.fn(), update: jest.fn() },
      marketplaceChargeback: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn(), aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }), create: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      marketplacePayoutHold: { create: jest.fn().mockResolvedValue({ id: 'hold-1' }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      marketplaceLedgerEntry: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    audit = { createInTransaction: jest.fn().mockResolvedValue(undefined) };
    authorization = { assertCan: jest.fn().mockResolvedValue(undefined) };
    registry = { validateResourceField: jest.fn((_resource: string, _field: string, value: unknown) => ({ valid: true, value, errors: [] })) };
    service = new MarketplaceService(prisma, authorization, audit, registry as any);
  });

  afterEach(() => {
    if (oldMode === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_MODE; else process.env.KK_MARKETPLACE_PAYMENT_MODE = oldMode;
    if (oldSecret === undefined) delete process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET; else process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET = oldSecret;
  });

  it('creates an accepted-order sandbox intent with idempotency and a no-money notice', async () => {
    const created = { ...payment, status: 'CREATED', providerPaymentId: 'sandbox_new' };
    prisma.marketplacePayment.create.mockResolvedValue(created);
    prisma.$transaction.mockImplementation((fn: any) => fn({ marketplacePayment: { create: prisma.marketplacePayment.create } }));
    const result = await service.createSandboxPaymentIntent('buyer-1', UserRole.FARMER, 'order-1', 'idem-key-0001');
    expect(result).toMatchObject({ id: 'payment-1', status: 'CREATED', simulationOnly: true });
    expect(result.notice).toContain('No money is collected');
    expect(authorization.assertCan).toHaveBeenCalled();
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CREATE_MARKETPLACE_SANDBOX_PAYMENT' }));
  });

  it('rejects an idempotency key already bound to another order', async () => {
    prisma.marketplacePayment.findUnique.mockResolvedValue({ ...payment, orderId: 'another-order' });
    await expect(service.createSandboxPaymentIntent('buyer-1', UserRole.FARMER, 'order-1', 'idem-key-0001')).rejects.toThrow(BadRequestException);
  });

  it('rejects a bad webhook signature', async () => {
    const event = { eventId: 'event-0001', providerPaymentId: payment.providerPaymentId, status: 'CAPTURED' as const, amount: '125.00', currency: 'INR' };
    const raw = Buffer.from(JSON.stringify(event));
    await expect(service.handleSandboxPaymentWebhook(raw, 'sha256=' + '0'.repeat(64), event)).rejects.toThrow(UnauthorizedException);
  });

  it('processes a signed capture once and writes balanced ledger entries even if new sandbox requests are disabled', async () => {
    prisma.marketplaceFeatureFlag.findUnique.mockResolvedValue({ enabled: false });
    const event = { eventId: 'event-0002', providerPaymentId: payment.providerPaymentId, status: 'CAPTURED' as const, amount: '125.00', currency: 'INR' };
    const raw = Buffer.from(JSON.stringify(event));
    const signature = createHmac('sha256', process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET!).update(raw).digest('hex');
    prisma.marketplacePayment.update.mockResolvedValue({ ...payment, status: 'CAPTURED' });
    prisma.marketplacePaymentEvent.create.mockResolvedValue({ id: 'event-row-1' });
    prisma.marketplaceLedgerEntry.create.mockResolvedValue({});
    prisma.$transaction.mockImplementation((fn: any) => fn({
      marketplacePaymentEvent: { findUnique: jest.fn().mockResolvedValue(null), create: prisma.marketplacePaymentEvent.create },
      marketplacePayment: { update: prisma.marketplacePayment.update },
      marketplaceLedgerEntry: { create: prisma.marketplaceLedgerEntry.create },
    }));
    const result = await service.handleSandboxPaymentWebhook(raw, signature, event);
    expect(result).toMatchObject({ accepted: true, replayed: false, paymentStatus: 'CAPTURED', simulationOnly: true, ledgerEntriesCreated: 2 });
    expect(prisma.marketplaceLedgerEntry.create).toHaveBeenCalledTimes(2);
    expect(prisma.marketplaceLedgerEntry.create).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ direction: 'DEBIT', amount: payment.amount, entryKey: 'payment-1:capture:debit' }) });
    expect(prisma.marketplaceLedgerEntry.create).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ direction: 'CREDIT', amount: payment.amount, entryKey: 'payment-1:capture:credit' }) });
  });

  it('creates a bounded, idempotent sandbox refund request for a captured buyer payment', async () => {
    prisma.marketplacePayment.findFirst.mockResolvedValue({ ...payment, status: 'CAPTURED' });
    const refund = { id: 'refund-1', orderId: 'order-1', paymentId: payment.id, createdById: 'buyer-1', status: 'REQUESTED', amount: new Prisma.Decimal('25.00'), currency: 'INR', providerRefundId: 'sandbox_refund_1234' };
    prisma.marketplaceRefund.create.mockResolvedValue(refund);
    prisma.$transaction.mockImplementation((fn: any) => fn({ marketplaceRefund: { aggregate: prisma.marketplaceRefund.aggregate, create: prisma.marketplaceRefund.create }, marketplaceChargeback: { aggregate: prisma.marketplaceChargeback.aggregate } }));
    const result = await service.createSandboxRefundRequest('buyer-1', UserRole.FARMER, 'order-1', { idempotencyKey: 'refund-idem-0001', amount: '25.00', reason: 'Damaged produce' });
    expect(result).toMatchObject({ id: 'refund-1', status: 'REQUESTED', amount: '25', simulationOnly: true });
    expect(result.notice).toContain('No money is moved');
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'CREATE_MARKETPLACE_SANDBOX_REFUND' }));
  });

  it('rejects sandbox refunds that exceed the remaining captured amount', async () => {
    prisma.marketplacePayment.findFirst.mockResolvedValue({ ...payment, status: 'CAPTURED' });
    prisma.marketplaceRefund.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal('120.00') } });
    await expect(service.createSandboxRefundRequest('buyer-1', UserRole.FARMER, 'order-1', { idempotencyKey: 'refund-idem-0002', amount: '10.00', reason: 'Damaged produce' })).rejects.toThrow('exceeds the remaining captured amount');
  });

  it('processes signed refund success with equal debit and credit reversal entries even if new refunds are disabled', async () => {
    prisma.marketplaceFeatureFlag.findUnique.mockResolvedValue({ enabled: false });
    const refund = { id: 'refund-2', orderId: 'order-1', paymentId: payment.id, status: 'REQUESTED', amount: new Prisma.Decimal('25.00'), currency: 'INR', providerRefundId: 'sandbox_refund_1234', payment: { provider: 'sandbox' } };
    prisma.marketplaceRefund.findFirst.mockResolvedValue(refund);
    prisma.marketplacePaymentEvent.findUnique.mockResolvedValue(null);
    prisma.marketplaceRefund.update.mockResolvedValue({ ...refund, status: 'SUCCEEDED' });
    prisma.marketplacePaymentEvent.create.mockResolvedValue({});
    prisma.marketplaceLedgerEntry.create.mockResolvedValue({});
    const event = { eventId: 'refund-event-001', providerRefundId: refund.providerRefundId, status: 'SUCCEEDED' as const, amount: '25.00', currency: 'INR' };
    const raw = Buffer.from(JSON.stringify(event));
    const signature = createHmac('sha256', process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET!).update(raw).digest('hex');
    prisma.$transaction.mockImplementation((fn: any) => fn({
      marketplacePaymentEvent: { findUnique: jest.fn().mockResolvedValue(null), create: prisma.marketplacePaymentEvent.create },
      marketplaceRefund: { update: prisma.marketplaceRefund.update },
      marketplaceLedgerEntry: { create: prisma.marketplaceLedgerEntry.create },
    }));
    const result = await service.handleSandboxRefundWebhook(raw, signature, event);
    expect(result).toMatchObject({ accepted: true, refundStatus: 'SUCCEEDED', simulationOnly: true, ledgerEntriesCreated: 2 });
    expect(prisma.marketplaceLedgerEntry.create).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ refundId: refund.id, direction: 'DEBIT', accountCode: 'BUYER_FUNDS_HELD' }) });
    expect(prisma.marketplaceLedgerEntry.create).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ refundId: refund.id, direction: 'CREDIT', accountCode: 'PAYMENT_CLEARING' }) });
  });

  it('opens an idempotent sandbox chargeback with an evidence deadline and payout hold', async () => {
    const chargeback = { id: 'chargeback-1', orderId: 'order-1', paymentId: payment.id, createdById: 'buyer-1', status: 'OPEN', amount: new Prisma.Decimal('35.00'), currency: 'INR', reason: 'Produce quality concern', evidenceUrls: ['https://evidence.example/photo'], evidenceDeadline: new Date(Date.now() + 86400000), providerChargebackId: 'sandbox_chargeback_1234' };
    prisma.marketplacePayment.findFirst.mockResolvedValue({ ...payment, status: 'CAPTURED' });
    prisma.marketplaceChargeback.create.mockResolvedValue(chargeback);
    prisma.$transaction.mockImplementation((fn: any) => fn({
      marketplaceRefund: { aggregate: prisma.marketplaceRefund.aggregate },
      marketplaceChargeback: { aggregate: prisma.marketplaceChargeback.aggregate, create: prisma.marketplaceChargeback.create },
      marketplacePayoutHold: { create: prisma.marketplacePayoutHold.create },
    }));
    const result = await service.createSandboxChargeback('buyer-1', UserRole.FARMER, 'order-1', { idempotencyKey: 'chargeback-idem-001', amount: '35.00', reason: 'Produce quality concern', evidenceUrls: ['https://evidence.example/photo'] });
    expect(result).toMatchObject({ id: 'chargeback-1', status: 'OPEN', amount: '35', simulationOnly: true });
    expect(result.notice).toContain('no money has moved');
    const hold = prisma.marketplacePayoutHold.create.mock.calls[0][0].data;
    expect(hold).toMatchObject({ status: 'ACTIVE', orderId: 'order-1', sellerId: 'seller-1' });
    expect(new Prisma.Decimal(hold.amount).equals('35.00')).toBe(true);
    expect(hold.reason).toContain('Sandbox chargeback sandbox_chargeback_');
  });

  it('fails closed when the sandbox payment dependency is disabled', async () => {
    prisma.marketplaceFeatureFlag.findUnique.mockImplementation(({ where }: any) => ({ enabled: where.key !== 'marketplace.payment_sandbox' }));
    await expect(service.createSandboxChargeback('buyer-1', UserRole.FARMER, 'order-1', { idempotencyKey: 'chargeback-idem-003', amount: '10.00', reason: 'Produce quality concern' })).rejects.toThrow('marketplace.payment_sandbox');
  });

  it('rejects non-HTTPS sandbox chargeback evidence', async () => {
    prisma.marketplacePayment.findFirst.mockResolvedValue({ ...payment, status: 'CAPTURED' });
    await expect(service.createSandboxChargeback('buyer-1', UserRole.FARMER, 'order-1', { idempotencyKey: 'chargeback-idem-002', amount: '10.00', reason: 'Produce quality concern', evidenceUrls: ['http://unsafe.example/evidence'] })).rejects.toThrow('HTTPS');
  });

  it('allows only the order seller to append HTTPS evidence before the deadline', async () => {
    const chargeback = { id: 'chargeback-evidence-1', orderId: 'order-1', createdById: 'buyer-1', status: 'OPEN', amount: new Prisma.Decimal('15.00'), currency: 'INR', reason: 'Produce quality concern', evidenceUrls: ['https://evidence.example/buyer'], evidenceDeadline: new Date(Date.now() + 86400000), updatedAt: new Date(), providerChargebackId: 'sandbox_chargeback_evidence', order: { sellerId: 'seller-1' } };
    const updated = { ...chargeback, evidenceUrls: [...chargeback.evidenceUrls, 'https://evidence.example/seller'] };
    prisma.marketplaceChargeback.findUnique.mockResolvedValue(chargeback);
    prisma.$transaction.mockImplementation((fn: any) => fn({
      marketplaceChargeback: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn().mockResolvedValue(updated) },
    }));
    const result = await service.submitSandboxChargebackEvidence('seller-1', UserRole.FARMER, chargeback.id, ['https://evidence.example/seller']);
    expect(result).toMatchObject({ id: chargeback.id, status: 'OPEN', simulationOnly: true });
    expect(result.evidenceUrls).toContain('https://evidence.example/seller');
    await expect(service.submitSandboxChargebackEvidence('not-the-seller', UserRole.FARMER, chargeback.id, ['https://evidence.example/unauthorized'])).rejects.toThrow('not found');
  });

  it('processes a signed sandbox chargeback loss with balanced reversal and releases the simulated hold even if new chargebacks are disabled', async () => {
    prisma.marketplaceFeatureFlag.findUnique.mockResolvedValue({ enabled: false });
    const chargeback = { id: 'chargeback-2', orderId: 'order-1', paymentId: payment.id, status: 'OPEN', amount: new Prisma.Decimal('25.00'), currency: 'INR', providerChargebackId: 'sandbox_chargeback_1234', payment: { provider: 'sandbox' } };
    prisma.marketplaceChargeback.findFirst.mockResolvedValue(chargeback);
    prisma.marketplaceChargeback.updateMany.mockResolvedValue({ count: 1 });
    prisma.marketplacePaymentEvent.findUnique.mockResolvedValue(null);
    prisma.marketplacePaymentEvent.create.mockResolvedValue({});
    prisma.marketplaceLedgerEntry.create.mockResolvedValue({});
    const event = { eventId: 'chargeback-event-001', providerChargebackId: chargeback.providerChargebackId, status: 'LOST' as const, amount: '25.00', currency: 'INR', reason: 'Evidence did not resolve the claim' };
    const raw = Buffer.from(JSON.stringify(event));
    const signature = createHmac('sha256', process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET!).update(raw).digest('hex');
    prisma.$transaction.mockImplementation((fn: any) => fn({
      marketplacePaymentEvent: { findUnique: jest.fn().mockResolvedValue(null), create: prisma.marketplacePaymentEvent.create },
      marketplaceChargeback: { updateMany: prisma.marketplaceChargeback.updateMany, findUnique: jest.fn().mockResolvedValue({ ...chargeback, status: 'LOST' }) },
      marketplaceLedgerEntry: { create: prisma.marketplaceLedgerEntry.create },
      marketplacePayoutHold: { updateMany: prisma.marketplacePayoutHold.updateMany },
    }));
    const result = await service.handleSandboxChargebackWebhook(raw, signature, event);
    expect(result).toMatchObject({ accepted: true, chargebackStatus: 'LOST', simulationOnly: true, ledgerEntriesCreated: 2, payoutHoldReleased: true });
    expect(prisma.marketplaceLedgerEntry.create).toHaveBeenCalledTimes(2);
    expect(prisma.marketplaceLedgerEntry.create).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ chargebackId: chargeback.id, direction: 'DEBIT', accountCode: 'BUYER_FUNDS_HELD' }) });
    expect(prisma.marketplaceLedgerEntry.create).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ chargebackId: chargeback.id, direction: 'CREDIT', accountCode: 'PAYMENT_CLEARING' }) });
    expect(prisma.marketplacePayoutHold.updateMany).toHaveBeenCalledWith({ where: expect.objectContaining({ status: 'ACTIVE', reason: expect.objectContaining({ contains: chargeback.providerChargebackId }) }), data: expect.objectContaining({ status: 'RELEASED' }) });
  });

  it('treats identical signed provider-event replay as idempotent', async () => {
    const event = { eventId: 'event-0003', providerPaymentId: payment.providerPaymentId, status: 'CAPTURED' as const, amount: '125.00', currency: 'INR' };
    const raw = Buffer.from(JSON.stringify(event));
    const signature = createHmac('sha256', process.env.KK_MARKETPLACE_PAYMENT_SANDBOX_SECRET!).update(raw).digest('hex');
    prisma.marketplacePaymentEvent.findUnique.mockResolvedValue({ paymentId: payment.id, payloadHash: createHash('sha256').update(raw).digest('hex') });
    const result = await service.handleSandboxPaymentWebhook(raw, signature, event);
    expect(result).toMatchObject({ accepted: true, replayed: true, paymentStatus: 'AUTHORIZED', simulationOnly: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
