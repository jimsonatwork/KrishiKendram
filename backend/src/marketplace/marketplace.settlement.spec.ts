import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';

describe('Marketplace settlement and reconciliation controls', () => {
  let prisma: any;
  let audit: any;
  let service: MarketplaceService;
  beforeEach(() => {
    prisma = {
      marketplaceFeatureFlag: { findUnique: jest.fn().mockResolvedValue({ enabled: true }) },
      marketplaceOrder: { findMany: jest.fn().mockResolvedValue([{ id: 'order-1', sellerId: 'seller-1', status: 'COMPLETED', currency: 'INR', subtotal: '100.00', sellerCommissionAmount: '5.00', sellerNet: '95.00', listing: { title: 'Paddy', category: 'PRODUCE' }, payments: [{ status: 'CAPTURED', amount: '100.00' }], refunds: [] }]), findUnique: jest.fn().mockResolvedValue({ id: 'order-1', sellerId: 'seller-1', currency: 'INR', sellerNet: '95.00', buyerTotal: '100.00', payments: [{ status: 'CAPTURED', amount: '100.00' }] }) },
      marketplacePayoutHold: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn().mockResolvedValue({ id: 'hold-1', amount: '95.00', status: 'ACTIVE' }), update: jest.fn() },
      marketplaceLedgerEntry: { findMany: jest.fn().mockResolvedValue([{ id: 'debit', currency: 'INR', direction: 'DEBIT', amount: '100.00', entryType: 'SANDBOX_PAYMENT_CAPTURE' }, { id: 'credit', currency: 'INR', direction: 'CREDIT', amount: '100.00', entryType: 'SANDBOX_PAYMENT_CAPTURE' }]) },
      marketplacePayment: { findMany: jest.fn().mockResolvedValue([{ id: 'payment-1', orderId: 'order-1', status: 'CAPTURED', ledgerEntries: [{ entryType: 'SANDBOX_PAYMENT_CAPTURE' }, { entryType: 'SANDBOX_PAYMENT_CAPTURE' }] }]) },
      marketplaceRefund: { findMany: jest.fn().mockResolvedValue([]) },
      marketplaceReconciliationRun: { create: jest.fn().mockResolvedValue({ id: 'run-1', balanced: true, status: 'BALANCED', debitTotal: '100.00', creditTotal: '100.00', exceptionCount: 0, completedAt: new Date() }), findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    audit = { createInTransaction: jest.fn().mockResolvedValue(undefined) };
    prisma.$transaction.mockImplementation((fn: any) => fn({ marketplaceReconciliationRun: { create: prisma.marketplaceReconciliationRun.create }, marketplacePayoutHold: { create: prisma.marketplacePayoutHold.create, update: prisma.marketplacePayoutHold.update } }));
    service = new MarketplaceService(prisma, { assertCan: jest.fn() } as any, audit, {} as any);
  });

  it('returns seller-scoped statement with simulated amounts clearly marked as not paid out', async () => {
    const result = await service.getSellerSettlementStatement('seller-1', UserRole.FARMER);
    expect(prisma.marketplaceOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sellerId: 'seller-1' } }));
    expect(result).toMatchObject({ mode: 'STATEMENT_ONLY', moneyMovementEnabled: false, totals: { gross: '100.00', commission: '5.00', sellerNetEstimate: '95.00', capturedSimulation: '100.00' } });
    expect(result.lines[0].settlementStatus).toBe('NOT_PAID_OUT');
  });

  it('records payout holds only for Super Admin and caps the total at the seller net estimate', async () => {
    await expect(service.createPayoutHold('admin-1', UserRole.ADMIN, 'order-1', 'Review requested')).rejects.toThrow(UnauthorizedException);
    const result = await service.createPayoutHold('super-1', UserRole.SUPER_ADMIN, 'order-1', 'Pending dispute review');
    expect(result).toMatchObject({ id: 'hold-1', moneyMovementEnabled: false });
    expect(prisma.marketplacePayoutHold.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sellerId: 'seller-1', orderId: 'order-1', amount: expect.anything(), reason: 'Pending dispute review' }) });
  });

  it('restricts reconciliation execution to Super Admin/God Mode authority', async () => {
    await expect(service.runMarketplaceReconciliation('admin-1', UserRole.ADMIN)).rejects.toThrow(UnauthorizedException);
    expect(prisma.marketplaceLedgerEntry.findMany).not.toHaveBeenCalled();
  });

  it('persists a balanced reconciliation result and audit record without enabling money movement', async () => {
    const result = await service.runMarketplaceReconciliation('super-1', UserRole.SUPER_ADMIN);
    expect(result).toMatchObject({ id: 'run-1', balanced: true, moneyMovementEnabled: false, summary: { ledgerEntryCount: 2, simulationOnly: true } });
    expect(prisma.marketplaceReconciliationRun.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'BALANCED', balanced: true, exceptionCount: 0 }) });
    expect(audit.createInTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'RUN_MARKETPLACE_RECONCILIATION' }));
  });

  it('detects an unbalanced ledger and missing captured-payment pair', async () => {
    prisma.marketplaceLedgerEntry.findMany.mockResolvedValue([{ id: 'debit', currency: 'INR', direction: 'DEBIT', amount: '100.00', entryType: 'SANDBOX_PAYMENT_CAPTURE' }]);
    prisma.marketplacePayment.findMany.mockResolvedValue([{ id: 'payment-2', orderId: 'order-2', status: 'CAPTURED', ledgerEntries: [] }]);
    prisma.marketplaceReconciliationRun.create.mockImplementation(({ data }: any) => ({ id: 'run-2', ...data, completedAt: new Date() }));
    const result = await service.runMarketplaceReconciliation('super-1', UserRole.SUPER_ADMIN);
    expect(result.balanced).toBe(false);
    expect(result.exceptionCount).toBeGreaterThanOrEqual(2);
    expect(result.summary.exceptions.map((item: any) => item.type)).toContain('CAPTURE_MISSING_LEDGER_PAIR');
    expect(result.summary.exceptions.map((item: any) => item.type)).toContain('UNBALANCED_CURRENCY');
  });
});
