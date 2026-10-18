/** Provider adapter contract. Implementations must verify signed webhooks and be idempotent. */
export interface MarketplacePaymentIntentRequest { orderId: string; amount: string; currency: string; idempotencyKey: string; quoteSnapshot: Record<string, unknown> }
export interface MarketplacePaymentIntentResult { provider: string; providerPaymentId: string; status: 'CREATED' | 'REQUIRES_ACTION' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED'; clientAction?: string }
export interface MarketplacePaymentProvider {
  readonly providerId: string;
  createIntent(request: MarketplacePaymentIntentRequest): Promise<MarketplacePaymentIntentResult>;
  verifyWebhook(rawBody: Uint8Array, headers: Record<string, string | undefined>): Promise<{ eventId: string; paymentId: string; status: string }>;
  refund(paymentId: string, amount: string, idempotencyKey: string): Promise<{ providerRefundId: string; status: 'PENDING' | 'SUCCEEDED' | 'FAILED' }>;
}
/** Safe default: until a reviewed provider is explicitly linked, no payment can be initiated. */
export class DisabledMarketplacePaymentProvider implements MarketplacePaymentProvider {
  readonly providerId = 'disabled';
  async createIntent(): Promise<MarketplacePaymentIntentResult> { throw new Error('Marketplace payments are disabled until a provider is configured and reviewed.'); }
  async verifyWebhook(): Promise<{ eventId: string; paymentId: string; status: string }> { throw new Error('No payment provider is configured to verify this webhook.'); }
  async refund(): Promise<{ providerRefundId: string; status: 'PENDING' | 'SUCCEEDED' | 'FAILED' }> { throw new Error('Marketplace refunds are disabled until a provider is configured and reviewed.'); }
}
